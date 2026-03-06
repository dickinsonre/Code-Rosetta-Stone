module Main where

import Data.Char (toUpper, isSpace, isDigit)
import Data.List (isPrefixOf, find, foldl')
import Data.Maybe (fromMaybe, mapMaybe)
import qualified Data.Map.Strict as Map
import Text.Printf (printf, hPrintf)
import System.IO (hFlush, stdout, hSetBinaryMode, stdin)
import System.CPUTime (getCPUTime)

data Options = Options
  { optFlowUnits :: String, optInfiltration :: String, optFlowRouting :: String
  , optStartDate :: String, optEndDate :: String
  , optReportStep :: Double, optWetStep :: Double, optDryStep :: Double
  , optRoutingStep :: Double, optTotalDuration :: Double, optMinSurfArea :: Double
  } deriving Show

data Gage = Gage { gId :: String, gSourceName :: String } deriving Show
data Subcatch = Subcatch
  { scId :: String, scRainGage :: String, scOutlet :: String
  , scArea :: Double, scPctImperv :: Double, scWidth :: Double, scSlope :: Double
  , scRunoff :: Double, scTotalPrecip :: Double, scTotalRunoff :: Double
  , scTotalInfil :: Double, scPeakRunoff :: Double
  } deriving Show
data Infil = Infil
  { infMaxRate :: Double, infMinRate :: Double, infDecay :: Double
  , infDryTime :: Double, infCurrentRate :: Double, infCumulInfil :: Double
  } deriving Show
data Node = Node
  { nId :: String, nType :: String, nInvertElev :: Double
  , nMaxDepth :: Double, nSurDepth :: Double, nAPonded :: Double
  , nDepth :: Double, nHead :: Double, nVolume :: Double
  , nInflow :: Double, nOutflow :: Double, nOverflow :: Double, nLateralInflow :: Double
  , nPeakDepth :: Double, nPeakHgl :: Double
  , nTotalInflow :: Double, nTotalOutflow :: Double, nFloodVolume :: Double
  } deriving Show
data Link = Link
  { lId :: String, lFromNode :: String, lToNode :: String
  , lLength :: Double, lRoughness :: Double, lInOffset :: Double, lOutOffset :: Double
  , lFlow :: Double, lDepth :: Double, lVelocity :: Double, lVolume :: Double
  , lPeakFlow :: Double, lPeakVelocity :: Double, lTimePeakFlow :: Double
  , lMaxDepthFrac :: Double, lFullDepth :: Double, lFullArea :: Double
  } deriving Show
data Xsect = Xsect
  { xId :: String, xType :: String, xGeom1 :: Double, xGeom2 :: Double
  , xAFull :: Double, xRFull :: Double
  } deriving Show
data TSeries = TSeries { tsId :: String, tsTimes :: [Double], tsValues :: [Double] } deriving Show

data Model = Model
  { mOptions :: Options, mGages :: [Gage], mSubcatchments :: [Subcatch], mInfils :: [Infil]
  , mNodes :: [Node], mLinks :: [Link], mXsects :: [Xsect]
  , mTimeseries :: Map.Map String TSeries, mNodeMap :: Map.Map String Int, mTitle :: String
  } deriving Show

piVal :: Double
piVal = 3.14159265358979323846

safeRead :: String -> Double
safeRead s = case reads s of { [(v,_)] -> v; _ -> 0 }

parseTimeStr :: String -> Double
parseTimeStr s = case break (==':') (filter (not . isSpace) s) of
  (h, ':':m) -> safeRead h * 3600 + safeRead m * 60
  _ -> safeRead s

parseDuration :: String -> String -> Double
parseDuration start end =
  let sp = wordsBy '/' start; ep = wordsBy '/' end
  in if length sp < 3 || length ep < 3 then 86400
     else let d = (safeRead (ep!!2) - safeRead (sp!!2))*365*86400 +
                  (safeRead (ep!!0) - safeRead (sp!!0))*30*86400 +
                  (safeRead (ep!!1) - safeRead (sp!!1))*86400
          in if d > 0 then d else 86400

wordsBy :: Char -> String -> [String]
wordsBy _ [] = []
wordsBy c s = let (w, rest) = break (==c) s in w : case rest of { [] -> []; (_:r) -> wordsBy c r }

defaultOptions :: Options
defaultOptions = Options "CFS" "HORTON" "DYNWAVE" "01/01/2024" "01/02/2024" 900 300 3600 30 86400 12.566

defaultInfil :: Infil
defaultInfil = Infil 3 0.5 4 7 3 0

emptyModel :: Model
emptyModel = Model defaultOptions [] [] [] [] [] [] Map.empty Map.empty ""

updateAt :: Int -> (a -> a) -> [a] -> [a]
updateAt _ _ [] = []
updateAt 0 f (x:xs) = f x : xs
updateAt n f (x:xs) = x : updateAt (n-1) f xs

parseInp :: String -> Model
parseInp text = let m = foldl' parseLine (emptyModel, "") (lines text)
  in let mdl = fst m in mdl { mOptions = (mOptions mdl) { optTotalDuration = parseDuration (optStartDate (mOptions mdl)) (optEndDate (mOptions mdl)) } }
  where
    parseLine (m, sec) line
      | null l || head l == ';' = (m, sec)
      | head l == '[' = (m, map toUpper (filter (\c -> c /= '[' && c /= ']') l))
      | otherwise = (processSection m sec (words l), sec)
      where l = dropWhile isSpace line
    processSection m "OPTIONS" (k:v:_) = case map toUpper k of
      "FLOW_UNITS" -> m { mOptions = (mOptions m) { optFlowUnits = v } }
      "INFILTRATION" -> m { mOptions = (mOptions m) { optInfiltration = v } }
      "FLOW_ROUTING" -> m { mOptions = (mOptions m) { optFlowRouting = v } }
      "START_DATE" -> m { mOptions = (mOptions m) { optStartDate = v } }
      "END_DATE" -> m { mOptions = (mOptions m) { optEndDate = v } }
      "REPORT_STEP" -> m { mOptions = (mOptions m) { optReportStep = parseTimeStr v } }
      "WET_STEP" -> m { mOptions = (mOptions m) { optWetStep = parseTimeStr v } }
      "DRY_STEP" -> m { mOptions = (mOptions m) { optDryStep = parseTimeStr v } }
      "ROUTING_STEP" -> m { mOptions = (mOptions m) { optRoutingStep = parseTimeStr v } }
      _ -> m
    processSection m "RAINGAGES" (i:_:_:_:_:sn:_) = m { mGages = mGages m ++ [Gage i sn] }
    processSection m "SUBCATCHMENTS" (i:rg:out:a:pi_:w:sl:_) =
      m { mSubcatchments = mSubcatchments m ++ [Subcatch i rg out (safeRead a) (safeRead pi_) (safeRead w) (safeRead sl) 0 0 0 0 0]
        , mInfils = mInfils m ++ [defaultInfil] }
    processSection m "INFILTRATION" ts@(i:mr:mnr:dc:rest)
      | length ts >= 4 = case findIdx i (map scId (mSubcatchments m)) of
          Nothing -> m
          Just idx -> m { mInfils = updateAt idx (\_ -> Infil (safeRead mr) (safeRead mnr) (safeRead dc) (if null rest then 7 else safeRead (head rest)) (safeRead mr) 0) (mInfils m) }
    processSection m "JUNCTIONS" ts
      | length ts >= 2 = let i = ts!!0; ie = safeRead (ts!!1)
                              md = if length ts > 2 then safeRead (ts!!2) else 0
                              initD = if length ts > 3 then safeRead (ts!!3) else 0
                              sd = if length ts > 4 then safeRead (ts!!4) else 0
                              ap = if length ts > 5 then safeRead (ts!!5) else 0
                              n = Node i "JUNCTION" ie md sd ap initD (ie+initD) 0 0 0 0 0 0 0 0 0 0
                          in m { mNodes = mNodes m ++ [n], mNodeMap = Map.insert i (length (mNodes m)) (mNodeMap m) }
    processSection m "OUTFALLS" ts
      | length ts >= 3 = let i = ts!!0; ie = safeRead (ts!!1)
                              n = Node i "OUTFALL" ie 0 0 0 0 ie 0 0 0 0 0 0 0 0 0 0
                          in m { mNodes = mNodes m ++ [n], mNodeMap = Map.insert i (length (mNodes m)) (mNodeMap m) }
    processSection m "CONDUITS" ts
      | length ts >= 6 = m { mLinks = mLinks m ++ [Link (ts!!0) (ts!!1) (ts!!2) (safeRead(ts!!3)) (safeRead(ts!!4)) (safeRead(ts!!5)) (if length ts > 6 then safeRead (ts!!6) else 0) 0 0 0 0 0 0 0 0 0 0] }
    processSection m "XSECTIONS" ts
      | length ts >= 3 = let i = ts!!0; tp = map toUpper (ts!!1); g1 = safeRead (ts!!2)
                              g2 = if length ts > 3 then safeRead (ts!!3) else 0
                              (af, rf) = if tp == "CIRCULAR" then (piVal * (g1/2)^(2::Int), g1/4)
                                         else let w = if g2 > 0 then g2 else g1; a = g1*w; p = 2*g1+2*w in (a, if p > 0 then a/p else 0)
                              xs = Xsect i tp g1 g2 af rf
                              lks = map (\lk -> if lId lk == i then lk { lFullDepth = g1, lFullArea = af } else lk) (mLinks m)
                          in m { mXsects = mXsects m ++ [xs], mLinks = lks }
    processSection m "TIMESERIES" ts
      | length ts >= 3 = let tsid = head ts
                              existing = Map.findWithDefault (TSeries tsid [] []) tsid (mTimeseries m)
                              (newTimes, newVals) = parseTSValues (tail ts)
                              updated = existing { tsTimes = tsTimes existing ++ newTimes, tsValues = tsValues existing ++ newVals }
                          in m { mTimeseries = Map.insert tsid updated (mTimeseries m) }
    processSection m _ _ = m
    findIdx _ [] = Nothing
    findIdx x (y:ys) = if x == y then Just 0 else fmap (+1) (findIdx x ys)
    parseTSValues [] = ([], [])
    parseTSValues [_] = ([], [])
    parseTSValues (t:v:rest) = let tv = case break (==':') t of
                                          (h,':':mi) -> safeRead h + safeRead mi / 60
                                          _ -> safeRead t
                                   (ts', vs') = parseTSValues rest
                               in (tv:ts', safeRead v:vs')

getRainfall :: Model -> String -> Double -> Double
getRainfall m gageId elapsed = case find (\g -> gId g == gageId) (mGages m) of
  Nothing -> 0
  Just g -> case Map.lookup (gSourceName g) (mTimeseries m) of
    Nothing -> 0
    Just ts -> let tHr = elapsed / 3600
                   pairs = reverse (zip (tsTimes ts) (tsValues ts))
               in case find (\(t,_) -> tHr >= t) pairs of
                    Just (_,v) -> v; Nothing -> 0

hortonInfil :: Infil -> Double -> Double -> (Double, Infil)
hortonInfil inf rainfall dt
  | rainfall <= 0 = let rec = if infDryTime inf > 0 then dt / (infDryTime inf * 86400) else 0
                    in (0, inf { infCurrentRate = infCurrentRate inf + (infMaxRate inf - infCurrentRate inf) * rec })
  | otherwise = let rate = min (infCurrentRate inf) rainfall
                    cr = infMinRate inf + (infCurrentRate inf - infMinRate inf) * exp (-infDecay inf * dt / 3600)
                in (rate, inf { infCurrentRate = cr, infCumulInfil = infCumulInfil inf + rate * dt / 3600 })

xsectArea :: Xsect -> Double -> Double
xsectArea xs depth
  | depth <= 0 = 0
  | xType xs == "CIRCULAR" = if depth >= xGeom1 xs then xAFull xs
      else let r = xGeom1 xs / 2; y = depth - r
           in if abs r < 1e-10 then 0
              else let arg = max (-1) (min 1 (-y/r)); theta = 2 * acos arg in r*r*(theta - sin theta)/2
  | otherwise = let w = if xGeom2 xs > 0 then xGeom2 xs else xGeom1 xs in depth * w

xsectHrad :: Xsect -> Double -> Double
xsectHrad xs depth = let area = xsectArea xs depth in
  if area <= 0 then 0
  else if xType xs == "CIRCULAR" then
    let r = xGeom1 xs / 2; y = depth - r
    in if abs r < 1e-10 then 0
       else let arg = max (-1) (min 1 (-y/r)); theta = 2 * acos arg; perim = r * theta
            in if perim > 0 then area / perim else 0
  else let w = if xGeom2 xs > 0 then xGeom2 xs else xGeom1 xs; perim = w + 2 * depth
       in if perim > 0 then area / perim else 0

findXsect :: Model -> String -> Maybe Xsect
findXsect m lid = find (\xs -> xId xs == lid) (mXsects m)

simulate :: Model -> (Int, Model)
simulate m0 = go m0 0 0
  where
    dt = optRoutingStep (mOptions m0); total = optTotalDuration (mOptions m0)
    go m elapsed steps
      | elapsed >= total = (steps, m)
      | otherwise =
        let (m1, infils1) = foldl' (\(mdl, infs) i ->
              let sc = mSubcatchments mdl !! i; inf = infs !! i
                  rain = getRainfall mdl (scRainGage sc) elapsed
                  (irate, inf') = hortonInfil inf (rain * (1 - scPctImperv sc / 100)) dt
                  sc' = sc { scRunoff = max 0 (rain * scArea sc * 43560 / 12 / 3600 - irate * scArea sc * (1 - scPctImperv sc/100) * 43560 / 12 / 3600)
                           , scTotalPrecip = scTotalPrecip sc + rain * dt / 3600
                           , scTotalInfil = scTotalInfil sc + irate * dt / 3600 }
                  sc'' = sc' { scTotalRunoff = scTotalRunoff sc' + scRunoff sc' * dt, scPeakRunoff = max (scPeakRunoff sc') (scRunoff sc') }
                  nodes' = case Map.lookup (scOutlet sc'') (mNodeMap mdl) of
                    Just ni -> updateAt ni (\n -> n { nLateralInflow = nLateralInflow n + scRunoff sc'' }) (mNodes mdl)
                    Nothing -> mNodes mdl
              in (mdl { mSubcatchments = updateAt i (const sc'') (mSubcatchments mdl), mNodes = nodes' }, updateAt i (const inf') infs)
              ) (m, mInfils m) [0..length (mSubcatchments m) - 1]
            nodes2 = map (\n -> n { nInflow = nLateralInflow n }) (mNodes m1)
            m2 = m1 { mInfils = infils1, mNodes = nodes2 }
            m3 = foldl' (\mdl li ->
              let lk = mLinks mdl !! li
              in case (Map.lookup (lFromNode lk) (mNodeMap mdl), Map.lookup (lToNode lk) (mNodeMap mdl), findXsect mdl (lId lk)) of
                (Just fi, Just ti, Just xs) ->
                  let n1 = mNodes mdl !! fi; n2 = mNodes mdl !! ti
                      slope = if lLength lk > 0 then (nHead n1 - nHead n2) / lLength lk else 0
                      avgD = max 0 (min (xGeom1 xs) ((nDepth n1 + nDepth n2) / 2))
                      area = xsectArea xs avgD; hrad = xsectHrad xs avgD
                      mq = if area > 0 && hrad > 0 && abs slope > 1e-12
                           then (if slope > 0 then 1 else -1) * (1.49 / lRoughness lk) * area * hrad ** (2/3) * sqrt (abs slope) else 0
                      flow' = lFlow lk * 0.5 + mq * 0.5
                      flow'' = if xAFull xs > 0 then
                                 let sl = max (abs slope) 0.001; qf = (1.49 / lRoughness lk) * xAFull xs * xRFull xs ** (2/3) * sqrt sl
                                 in if abs flow' > qf * 1.5 then (if flow' > 0 then 1 else -1) * qf * 1.5 else flow'
                               else flow'
                      vel = if area > 0 then abs flow'' / area else 0
                      (pf, tpf) = if abs flow'' > lPeakFlow lk then (abs flow'', elapsed) else (lPeakFlow lk, lTimePeakFlow lk)
                      mdf = if xGeom1 xs > 0 then max (lMaxDepthFrac lk) (avgD / xGeom1 xs) else lMaxDepthFrac lk
                      lk' = lk { lFlow = flow'', lDepth = avgD, lVelocity = vel, lVolume = area * lLength lk, lPeakFlow = pf, lTimePeakFlow = tpf, lPeakVelocity = max (lPeakVelocity lk) vel, lMaxDepthFrac = mdf }
                      nodes' = if flow'' > 0 then updateAt fi (\n -> n { nOutflow = nOutflow n + flow'' }) (updateAt ti (\n -> n { nInflow = nInflow n + flow'' }) (mNodes mdl))
                               else mNodes mdl
                  in mdl { mLinks = updateAt li (const lk') (mLinks mdl), mNodes = nodes' }
                _ -> mdl
              ) m2 [0..length (mLinks m2) - 1]
            nodes4 = map (\n ->
              if nType n == "OUTFALL" then n { nLateralInflow = 0, nInflow = 0, nOutflow = 0, nOverflow = 0 }
              else let sa = if nAPonded n > 0 then nAPonded n else optMinSurfArea (mOptions m3)
                       net = nInflow n - nOutflow n + nLateralInflow n
                       d = max 0 (nDepth n + net * dt / sa)
                       (d', fv) = if nMaxDepth n > 0 && d > nMaxDepth n + nSurDepth n
                                  then (nMaxDepth n, nFloodVolume n + (d - nMaxDepth n) * dt) else (d, nFloodVolume n)
                       hd = nInvertElev n + d'
                   in n { nDepth = d', nHead = hd, nVolume = d' * sa, nPeakDepth = max (nPeakDepth n) d', nPeakHgl = max (nPeakHgl n) hd
                        , nTotalInflow = nTotalInflow n + nInflow n * dt, nTotalOutflow = nTotalOutflow n + nOutflow n * dt, nFloodVolume = fv
                        , nLateralInflow = 0, nInflow = 0, nOutflow = 0, nOverflow = 0 }) (mNodes m3)
        in go (m3 { mNodes = nodes4 }) (elapsed + dt) (steps + 1)

fmtPeakTime :: Double -> String
fmtPeakTime secs
  | secs <= 0 = "0  00:00"
  | otherwise = let days = floor (secs / 86400) :: Int; rem' = secs - fromIntegral days * 86400
                    hrs = floor (rem' / 3600) :: Int; mins = floor ((rem' - fromIntegral hrs * 3600) / 60) :: Int
                in printf "%d  %02d:%02d" days hrs mins

generateRpt :: Model -> Int -> Double -> String
generateRpt m steps wallMs = unlines $
  [ "  EPA STORM WATER MANAGEMENT MODEL -- HASKELL ENGINE"
  , "  SWMM5-Haskell v1.0 -- SWMM5 Rosetta Stone Project"
  , "  " ++ replicate 60 '=', ""
  , "  ****************", "  Analysis Options", "  ****************"
  , printf "  Flow Units ............... %s" (optFlowUnits (mOptions m))
  , printf "  Flow Routing Method ...... %s" (optFlowRouting (mOptions m))
  , printf "  Infiltration Method ...... %s" (optInfiltration (mOptions m))
  , printf "  Starting Date ............ %s" (optStartDate (mOptions m))
  , printf "  Ending Date .............. %s" (optEndDate (mOptions m))
  , printf "  Routing Time Step ........ %.2f sec" (optRoutingStep (mOptions m)), ""
  , "  ******************", "  Node Depth Summary", "  ******************", ""
  , "  " ++ replicate 95 '-' ] ++
  map (\n -> printf "  %-30s %10.3f %10.3f %12.3f" (nId n) (nPeakDepth n * 0.4) (nPeakDepth n) (nPeakHgl n)) (mNodes m) ++
  [ "", "  *************************", "  Conduit Flow Summary", "  *************************", ""
  , "  " ++ replicate 95 '-' ] ++
  map (\lk -> let xs = findXsect m (lId lk)
                  fq = case xs of Just x -> if xAFull x > 0 && xRFull x > 0 then (1.49 / lRoughness lk) * xAFull x * xRFull x ** (2/3) * sqrt 0.01 else 1; Nothing -> 1
                  mff = if fq > 0 then lPeakFlow lk / fq else 0
              in printf "  %-30s %10.3f %12s %10.3f %8.2f %8.2f" (lId lk) (lPeakFlow lk) (fmtPeakTime (lTimePeakFlow lk)) (lPeakVelocity lk) mff (lMaxDepthFrac lk)) (mLinks m) ++
  [ "", "  *********************", "  Simulation Summary", "  *********************", ""
  , "  Engine ................... SWMM5-Haskell v1.0"
  , printf "  Total Steps .............. %d" steps
  , printf "  Simulation Duration ...... %.1f seconds (%.2f hours)" (optTotalDuration (mOptions m)) (optTotalDuration (mOptions m) / 3600)
  , printf "  Wall-Clock Time .......... %.1f ms" wallMs
  , printf "  Nodes .................... %d" (length (mNodes m))
  , printf "  Links .................... %d" (length (mLinks m))
  , printf "  Subcatchments ............ %d" (length (mSubcatchments m)), "" ]

escapeJson :: String -> String
escapeJson [] = []
escapeJson ('\\':rest) = '\\':'\\': escapeJson rest
escapeJson ('"':rest) = '\\':'"': escapeJson rest
escapeJson ('\n':rest) = '\\':'n': escapeJson rest
escapeJson ('\r':rest) = '\\':'r': escapeJson rest
escapeJson ('\t':rest) = '\\':'t': escapeJson rest
escapeJson (c:rest) = c : escapeJson rest

main :: IO ()
main = do
  hSetBinaryMode stdin True
  inp <- getContents
  t0 <- getCPUTime
  let m = parseInp inp
      (steps, m') = simulate m
  t1 <- getCPUTime
  let wallMs = fromIntegral (t1 - t0) / 1e9 :: Double
      rpt = generateRpt m' steps wallMs
      json = "{\"success\":true,\"rpt\":\"" ++ escapeJson rpt ++ "\"}"
  putStr json
  hFlush stdout
