#!/usr/bin/env racket
#lang racket

(require racket/tcp racket/string racket/match racket/math)

(define PI 3.14159265358979323846)

(struct options ([flow-units #:mutable] [infiltration #:mutable] [flow-routing #:mutable]
  [start-date #:mutable] [end-date #:mutable] [report-step #:mutable] [wet-step #:mutable]
  [dry-step #:mutable] [routing-step #:mutable] [total-duration #:mutable] [min-surf-area #:mutable]) #:transparent)

(struct gage (id format interval scf source-type source-name) #:transparent)

(struct subcatch ([id] [rain-gage] [outlet] [area] [pct-imperv] [width] [slope]
  [runoff #:mutable] [rainfall #:mutable] [total-precip #:mutable] [total-runoff #:mutable]
  [total-infil #:mutable] [peak-runoff #:mutable]) #:transparent)

(struct infil ([max-rate #:mutable] [min-rate #:mutable] [decay #:mutable] [dry-time #:mutable]
  [current-rate #:mutable] [cumul-infil #:mutable]) #:transparent)

(struct node ([id] [type] [invert-elev] [max-depth #:mutable] [init-depth #:mutable]
  [sur-depth #:mutable] [a-ponded #:mutable] [depth #:mutable] [head #:mutable]
  [volume #:mutable] [inflow #:mutable] [outflow #:mutable] [overflow #:mutable]
  [lateral-inflow #:mutable] [peak-depth #:mutable] [peak-hgl #:mutable]
  [time-peak-depth #:mutable] [total-inflow #:mutable] [total-outflow #:mutable]
  [flood-volume #:mutable]) #:transparent)

(struct link ([id] [from-node] [to-node] [len] [roughness] [in-offset] [out-offset]
  [flow #:mutable] [depth #:mutable] [velocity #:mutable] [vol #:mutable]
  [peak-flow #:mutable] [peak-velocity #:mutable] [time-peak-flow #:mutable]
  [max-depth-frac #:mutable] [full-depth #:mutable] [full-area #:mutable]) #:transparent)

(struct xsect (id xtype geom1 geom2 a-full r-full) #:transparent)
(struct ts ([id] [times #:mutable] [values #:mutable]) #:transparent)

(struct model ([opts] [gages #:mutable] [subcatchments #:mutable] [infils #:mutable]
  [nodes #:mutable] [links #:mutable] [xsects #:mutable] [timeseries #:mutable]
  [node-map #:mutable] [title #:mutable]) #:transparent)

(define (safe-float s [default 0.0])
  (with-handlers ([exn:fail? (lambda (_) default)]) (string->number s)))

(define (parse-time-str s)
  (define parts (string-split (string-trim s) ":"))
  (if (>= (length parts) 2)
    (+ (* (or (safe-float (first parts)) 0) 3600) (* (or (safe-float (second parts)) 0) 60)
       (if (> (length parts) 2) (or (safe-float (third parts)) 0) 0))
    (or (safe-float (string-trim s)) 0)))

(define (parse-duration start end)
  (with-handlers ([exn:fail? (lambda (_) 86400.0)])
    (define sp (string-split start "/")) (define ep (string-split end "/"))
    (if (or (< (length sp) 3) (< (length ep) 3)) 86400.0
      (let* ([d1 (find-seconds 0 0 0 (string->number (second sp)) (string->number (first sp)) (string->number (third sp)))]
             [d2 (find-seconds 0 0 0 (string->number (second ep)) (string->number (first ep)) (string->number (third ep)))]
             [diff (- d2 d1)])
        (if (> diff 0) (exact->inexact diff) 86400.0)))))

(define (new-options)
  (options "CFS" "HORTON" "DYNWAVE" "01/01/2024" "01/02/2024" 900.0 300.0 3600.0 30.0 86400.0 12.566))

(define (new-infil) (infil 3.0 0.5 4.0 7.0 3.0 0.0))

(define (parse-inp text)
  (define m (model (new-options) '() '() '() '() '() '() (make-hash) (make-hash) ""))
  (define section "")
  (for ([line (string-split text "\n")])
    (define l (string-trim line))
    (cond
      [(or (= (string-length l) 0) (char=? (string-ref l 0) #\;)) (void)]
      [(char=? (string-ref l 0) #\[)
       (set! section (string-upcase (string-replace (string-replace l "[" "") "]" "")))]
      [else
       (define t (string-split l))
       (when (> (length t) 0)
         (match section
           ["TITLE" (set-model-title! m l)]
           ["OPTIONS" (when (>= (length t) 2)
             (match (string-upcase (first t))
               ["FLOW_UNITS" (set-options-flow-units! (model-opts m) (second t))]
               ["INFILTRATION" (set-options-infiltration! (model-opts m) (second t))]
               ["FLOW_ROUTING" (set-options-flow-routing! (model-opts m) (second t))]
               ["START_DATE" (set-options-start-date! (model-opts m) (second t))]
               ["END_DATE" (set-options-end-date! (model-opts m) (second t))]
               ["REPORT_STEP" (set-options-report-step! (model-opts m) (parse-time-str (second t)))]
               ["WET_STEP" (set-options-wet-step! (model-opts m) (parse-time-str (second t)))]
               ["DRY_STEP" (set-options-dry-step! (model-opts m) (parse-time-str (second t)))]
               ["ROUTING_STEP" (set-options-routing-step! (model-opts m) (parse-time-str (second t)))]
               [_ (void)]))]
           ["RAINGAGES" (when (>= (length t) 6)
             (set-model-gages! m (append (model-gages m)
               (list (gage (first t) (second t) (/ (parse-time-str (third t)) 60) (or (safe-float (fourth t)) 0) (fifth t) (sixth t))))))]
           ["SUBCATCHMENTS" (when (>= (length t) 7)
             (set-model-subcatchments! m (append (model-subcatchments m)
               (list (subcatch (first t) (second t) (third t) (or (safe-float (fourth t)) 0) (or (safe-float (fifth t)) 0)
                 (or (safe-float (sixth t)) 0) (or (safe-float (seventh t)) 0) 0 0 0 0 0 0))))
             (set-model-infils! m (append (model-infils m) (list (new-infil)))))]
           ["INFILTRATION" (when (>= (length t) 4)
             (for ([i (in-range (length (model-subcatchments m)))])
               (when (equal? (subcatch-id (list-ref (model-subcatchments m) i)) (first t))
                 (set-model-infils! m (list-set (model-infils m) i
                   (infil (or (safe-float (second t)) 3) (or (safe-float (third t)) 0.5)
                     (or (safe-float (fourth t)) 4) (if (> (length t) 4) (or (safe-float (fifth t)) 7) 7.0)
                     (or (safe-float (second t)) 3) 0.0))))))]
           ["JUNCTIONS" (when (>= (length t) 2)
             (define initD (if (> (length t) 3) (or (safe-float (fourth t)) 0) 0.0))
             (define n (node (first t) "JUNCTION" (or (safe-float (second t)) 0)
               (if (> (length t) 2) (or (safe-float (third t)) 0) 0.0) initD
               (if (> (length t) 4) (or (safe-float (fifth t)) 0) 0.0)
               (if (> (length t) 5) (or (safe-float (sixth t)) 0) 0.0)
               initD (+ (or (safe-float (second t)) 0) initD) 0 0 0 0 0 0 0 0 0 0 0))
             (hash-set! (model-node-map m) (node-id n) (length (model-nodes m)))
             (set-model-nodes! m (append (model-nodes m) (list n))))]
           ["OUTFALLS" (when (>= (length t) 3)
             (define elev (or (safe-float (second t)) 0))
             (define n (node (first t) "OUTFALL" elev 0 0 0 0 0 elev 0 0 0 0 0 0 0 0 0 0 0))
             (hash-set! (model-node-map m) (node-id n) (length (model-nodes m)))
             (set-model-nodes! m (append (model-nodes m) (list n))))]
           ["CONDUITS" (when (>= (length t) 6)
             (set-model-links! m (append (model-links m)
               (list (link (first t) (second t) (third t) (or (safe-float (fourth t)) 0)
                 (or (safe-float (fifth t)) 0) (or (safe-float (sixth t)) 0)
                 (if (> (length t) 6) (or (safe-float (seventh t)) 0) 0.0) 0 0 0 0 0 0 0 0 0 0)))))]
           ["XSECTIONS" (when (>= (length t) 3)
             (define g1 (or (safe-float (third t)) 1.0))
             (define g2 (if (> (length t) 3) (or (safe-float (fourth t)) 0) 0.0))
             (define tp (string-upcase (second t)))
             (define-values (af rf)
               (if (equal? tp "CIRCULAR") (values (* PI (expt (/ g1 2) 2)) (/ g1 4))
                 (let* ([w (if (> g2 0) g2 g1)] [a (* g1 w)] [p (+ (* 2 g1) (* 2 w))])
                   (values a (if (> p 0) (/ a p) 0.0)))))
             (set-model-links! m (for/list ([lk (model-links m)])
               (if (equal? (link-id lk) (first t)) (begin (set-link-full-depth! lk g1) (set-link-full-area! lk af) lk) lk)))
             (set-model-xsects! m (append (model-xsects m) (list (xsect (first t) tp g1 g2 af rf)))))]
           ["TIMESERIES" (when (>= (length t) 3)
             (unless (hash-has-key? (model-timeseries m) (first t))
               (hash-set! (model-timeseries m) (first t) (ts (first t) '() '())))
             (define tsd (hash-ref (model-timeseries m) (first t)))
             (let loop ([k 1])
               (when (< (+ k 1) (length t))
                 (define tval (safe-float (list-ref t k) #f))
                 (define tv (or tval
                   (let ([p (string-split (list-ref t k) ":")])
                     (+ (or (safe-float (first p)) 0) (if (> (length p) 1) (/ (or (safe-float (second p)) 0) 60) 0)))))
                 (set-ts-times! tsd (append (ts-times tsd) (list tv)))
                 (set-ts-values! tsd (append (ts-values tsd) (list (or (safe-float (list-ref t (+ k 1))) 0))))
                 (loop (+ k 2)))))]
           [_ (void)]))]))
  (set-options-total-duration! (model-opts m) (parse-duration (options-start-date (model-opts m)) (options-end-date (model-opts m))))
  m)

(define (get-rainfall m gage-id elapsed)
  (define g (findf (lambda (g) (equal? (gage-id g) gage-id)) (model-gages m)))
  (if (not g) 0
    (let ([tsd (hash-ref (model-timeseries m) (gage-source-name g) #f)])
      (if (or (not tsd) (null? (ts-times tsd))) 0
        (let ([t-hr (/ elapsed 3600.0)])
          (let loop ([i (- (length (ts-times tsd)) 1)])
            (if (< i 0) 0
              (if (>= t-hr (list-ref (ts-times tsd) i)) (list-ref (ts-values tsd) i) (loop (- i 1))))))))))

(define (horton-infil! inf rainfall dt)
  (cond
    [(<= rainfall 0)
     (define rec (if (> (infil-dry-time inf) 0) (/ dt (* (infil-dry-time inf) 86400)) 0.0))
     (set-infil-current-rate! inf (+ (infil-current-rate inf) (* (- (infil-max-rate inf) (infil-current-rate inf)) rec)))
     0]
    [else
     (define rate (min (infil-current-rate inf) rainfall))
     (set-infil-current-rate! inf (+ (infil-min-rate inf) (* (- (infil-current-rate inf) (infil-min-rate inf)) (exp (- (* (infil-decay inf) dt (/ 1 3600)))))))
     (set-infil-cumul-infil! inf (+ (infil-cumul-infil inf) (* rate dt (/ 1 3600))))
     rate]))

(define (xsect-area xs depth)
  (if (<= depth 0) 0
    (if (equal? (xsect-xtype xs) "CIRCULAR")
      (if (>= depth (xsect-geom1 xs)) (xsect-a-full xs)
        (let* ([r (/ (xsect-geom1 xs) 2)] [y (- depth r)])
          (if (< (abs r) 1e-10) 0
            (let* ([arg (max -1.0 (min 1.0 (/ (- y) r)))] [theta (* 2 (acos arg))])
              (/ (* r r (- theta (sin theta))) 2)))))
      (let ([w (if (> (xsect-geom2 xs) 0) (xsect-geom2 xs) (xsect-geom1 xs))]) (* depth w)))))

(define (xsect-hrad xs depth)
  (define area (xsect-area xs depth))
  (if (<= area 0) 0
    (if (equal? (xsect-xtype xs) "CIRCULAR")
      (let* ([r (/ (xsect-geom1 xs) 2)] [y (- depth r)])
        (if (< (abs r) 1e-10) 0
          (let* ([arg (max -1.0 (min 1.0 (/ (- y) r)))] [theta (* 2 (acos arg))] [perim (* r theta)])
            (if (> perim 0) (/ area perim) 0))))
      (let* ([w (if (> (xsect-geom2 xs) 0) (xsect-geom2 xs) (xsect-geom1 xs))] [perim (+ w (* 2 depth))])
        (if (> perim 0) (/ area perim) 0)))))

(define (find-xsect m link-id) (findf (lambda (xs) (equal? (xsect-id xs) link-id)) (model-xsects m)))

(define (simulate! m)
  (define dt (options-routing-step (model-opts m)))
  (define total (options-total-duration (model-opts m)))
  (define elapsed 0.0) (define steps 0)
  (let loop ()
    (when (< elapsed total)
      (for ([i (in-range (length (model-subcatchments m)))])
        (define sc (list-ref (model-subcatchments m) i))
        (define rain (get-rainfall m (subcatch-rain-gage sc) elapsed))
        (set-subcatch-rainfall! sc rain)
        (set-subcatch-total-precip! sc (+ (subcatch-total-precip sc) (* rain dt (/ 1 3600))))
        (define infil-rate (horton-infil! (list-ref (model-infils m) i) (* rain (- 1 (/ (subcatch-pct-imperv sc) 100))) dt))
        (set-subcatch-total-infil! sc (+ (subcatch-total-infil sc) (* infil-rate dt (/ 1 3600))))
        (define runoff-in (* rain (subcatch-area sc) 43560 (/ 1 12) (/ 1 3600)))
        (define infil-vol (* infil-rate (subcatch-area sc) (- 1 (/ (subcatch-pct-imperv sc) 100)) 43560 (/ 1 12) (/ 1 3600)))
        (define runoff (max 0.0 (- runoff-in infil-vol)))
        (set-subcatch-runoff! sc runoff)
        (set-subcatch-total-runoff! sc (+ (subcatch-total-runoff sc) (* runoff dt)))
        (set-subcatch-peak-runoff! sc (max (subcatch-peak-runoff sc) runoff))
        (define ni (hash-ref (model-node-map m) (subcatch-outlet sc) #f))
        (when ni (set-node-lateral-inflow! (list-ref (model-nodes m) ni) (+ (node-lateral-inflow (list-ref (model-nodes m) ni)) runoff))))
      (for ([n (model-nodes m)]) (set-node-inflow! n (node-lateral-inflow n)))
      (for ([lk (model-links m)])
        (define fi (hash-ref (model-node-map m) (link-from-node lk) #f))
        (define ti (hash-ref (model-node-map m) (link-to-node lk) #f))
        (when (and fi ti)
          (define xs (find-xsect m (link-id lk)))
          (when xs
            (define n1 (list-ref (model-nodes m) fi)) (define n2 (list-ref (model-nodes m) ti))
            (define slope (if (> (link-len lk) 0) (/ (- (node-head n1) (node-head n2)) (link-len lk)) 0.0))
            (define avg-depth (max 0.0 (min (xsect-geom1 xs) (/ (+ (node-depth n1) (node-depth n2)) 2))))
            (define area (xsect-area xs avg-depth)) (define hrad (xsect-hrad xs avg-depth))
            (define manning-q (if (and (> area 0) (> hrad 0) (> (abs slope) 1e-12))
              (* (if (> slope 0) 1.0 -1.0) (/ 1.49 (link-roughness lk)) area (expt hrad (/ 2.0 3.0)) (sqrt (abs slope))) 0.0))
            (set-link-flow! lk (+ (* (link-flow lk) 0.5) (* manning-q 0.5)))
            (when (> (xsect-a-full xs) 0)
              (define sl (max (abs slope) 0.001))
              (define q-full (* (/ 1.49 (link-roughness lk)) (xsect-a-full xs) (expt (xsect-r-full xs) (/ 2.0 3.0)) (sqrt sl)))
              (when (> (abs (link-flow lk)) (* q-full 1.5))
                (set-link-flow! lk (* (if (> (link-flow lk) 0) 1.0 -1.0) q-full 1.5))))
            (set-link-depth! lk avg-depth)
            (set-link-velocity! lk (if (> area 0) (/ (abs (link-flow lk)) area) 0))
            (set-link-vol! lk (* area (link-len lk)))
            (when (> (abs (link-flow lk)) (link-peak-flow lk))
              (set-link-peak-flow! lk (abs (link-flow lk))) (set-link-time-peak-flow! lk elapsed))
            (set-link-peak-velocity! lk (max (link-peak-velocity lk) (link-velocity lk)))
            (when (> (xsect-geom1 xs) 0) (set-link-max-depth-frac! lk (max (link-max-depth-frac lk) (/ avg-depth (xsect-geom1 xs)))))
            (when (> (link-flow lk) 0)
              (set-node-outflow! n1 (+ (node-outflow n1) (link-flow lk)))
              (set-node-inflow! n2 (+ (node-inflow n2) (link-flow lk)))))))
      (for ([n (model-nodes m)])
        (unless (equal? (node-type n) "OUTFALL")
          (define sa (if (> (node-a-ponded n) 0) (node-a-ponded n) (options-min-surf-area (model-opts m))))
          (define net (+ (node-inflow n) (- (node-outflow n)) (node-lateral-inflow n)))
          (set-node-depth! n (+ (node-depth n) (/ (* net dt) sa)))
          (set-node-depth! n (max 0.0 (node-depth n)))
          (when (and (> (node-max-depth n) 0) (> (node-depth n) (+ (node-max-depth n) (node-sur-depth n))))
            (set-node-overflow! n (- (node-depth n) (node-max-depth n)))
            (set-node-flood-volume! n (+ (node-flood-volume n) (* (node-overflow n) dt)))
            (set-node-depth! n (node-max-depth n)))
          (set-node-head! n (+ (node-invert-elev n) (node-depth n)))
          (set-node-volume! n (* (node-depth n) sa))
          (set-node-peak-depth! n (max (node-peak-depth n) (node-depth n)))
          (set-node-peak-hgl! n (max (node-peak-hgl n) (node-head n)))
          (set-node-total-inflow! n (+ (node-total-inflow n) (* (node-inflow n) dt)))
          (set-node-total-outflow! n (+ (node-total-outflow n) (* (node-outflow n) dt))))
        (set-node-lateral-inflow! n 0) (set-node-inflow! n 0) (set-node-outflow! n 0) (set-node-overflow! n 0))
      (set! elapsed (+ elapsed dt)) (set! steps (+ steps 1))
      (loop)))
  (values steps elapsed))

(define (fmt-peak-time secs)
  (if (<= secs 0) "0  00:00"
    (let* ([days (inexact->exact (floor (/ secs 86400)))]
           [rem (- secs (* days 86400))]
           [hrs (inexact->exact (floor (/ rem 3600)))]
           [mins (inexact->exact (floor (/ (- rem (* hrs 3600)) 60)))])
      (format "~a  ~a:~a" days (~a hrs #:min-width 2 #:pad-string "0") (~a mins #:min-width 2 #:pad-string "0")))))

(define (generate-rpt m steps wall-ms)
  (define lines '())
  (define (add! s) (set! lines (append lines (list s))))
  (add! "  EPA STORM WATER MANAGEMENT MODEL -- RACKET ENGINE")
  (add! "  SWMM5-Racket v1.0 -- SWMM5 Rosetta Stone Project")
  (add! (string-append "  " (make-string 60 #\=)))
  (add! "") (add! "  ****************") (add! "  Analysis Options") (add! "  ****************")
  (add! (format "  Flow Units ............... ~a" (options-flow-units (model-opts m))))
  (add! (format "  Flow Routing Method ...... ~a" (options-flow-routing (model-opts m))))
  (add! (format "  Infiltration Method ...... ~a" (options-infiltration (model-opts m))))
  (add! (format "  Starting Date ............ ~a" (options-start-date (model-opts m))))
  (add! (format "  Ending Date .............. ~a" (options-end-date (model-opts m))))
  (add! (format "  Routing Time Step ........ ~a sec" (~r (options-routing-step (model-opts m)) #:precision '(= 2))))
  (add! "") (add! "  ******************") (add! "  Node Depth Summary") (add! "  ******************")
  (add! "") (add! (string-append "  " (make-string 95 #\-)))
  (for ([n (model-nodes m)])
    (add! (format "  ~a ~a ~a ~a" (~a (node-id n) #:min-width 30) (~r (* (node-peak-depth n) 0.4) #:min-width 10 #:precision '(= 3))
      (~r (node-peak-depth n) #:min-width 10 #:precision '(= 3)) (~r (node-peak-hgl n) #:min-width 12 #:precision '(= 3)))))
  (add! "") (add! "  *************************") (add! "  Conduit Flow Summary") (add! "  *************************")
  (add! "") (add! (string-append "  " (make-string 95 #\-)))
  (for ([lk (model-links m)])
    (define xs (find-xsect m (link-id lk)))
    (define full-q (if (and xs (> (xsect-a-full xs) 0) (> (xsect-r-full xs) 0))
      (* (/ 1.49 (link-roughness lk)) (xsect-a-full xs) (expt (xsect-r-full xs) (/ 2.0 3.0)) (sqrt 0.01)) 1.0))
    (define mff (if (> full-q 0) (/ (link-peak-flow lk) full-q) 0.0))
    (add! (format "  ~a ~a ~a ~a ~a ~a" (~a (link-id lk) #:min-width 30)
      (~r (link-peak-flow lk) #:min-width 10 #:precision '(= 3))
      (~a (fmt-peak-time (link-time-peak-flow lk)) #:min-width 12)
      (~r (link-peak-velocity lk) #:min-width 10 #:precision '(= 3))
      (~r mff #:min-width 8 #:precision '(= 2))
      (~r (link-max-depth-frac lk) #:min-width 8 #:precision '(= 2)))))
  (add! "") (add! "  *********************") (add! "  Simulation Summary") (add! "  *********************") (add! "")
  (add! "  Engine ................... SWMM5-Racket v1.0")
  (add! (format "  Total Steps .............. ~a" steps))
  (add! (format "  Simulation Duration ...... ~a seconds (~a hours)"
    (~r (options-total-duration (model-opts m)) #:precision '(= 1))
    (~r (/ (options-total-duration (model-opts m)) 3600) #:precision '(= 2))))
  (add! (format "  Wall-Clock Time .......... ~a ms" (~r wall-ms #:precision '(= 1))))
  (add! (format "  Nodes .................... ~a" (length (model-nodes m))))
  (add! (format "  Links .................... ~a" (length (model-links m))))
  (add! (format "  Subcatchments ............ ~a" (length (model-subcatchments m))))
  (add! "")
  (string-join lines "\n"))

(define (escape-json s)
  (string-replace (string-replace (string-replace (string-replace (string-replace s "\\" "\\\\") "\"" "\\\"") "\n" "\\n") "\r" "\\r") "\t" "\\t"))

(define port (string->number (or (getenv "RACKET_ENGINE_PORT") "3018")))
(define listener (tcp-listen port 16 #t "127.0.0.1"))
(printf "SWMM5-Racket engine listening on port ~a\n" port)
(flush-output)

(let loop ()
  (define-values (in out) (tcp-accept listener))
  (with-handlers ([exn:fail? (lambda (e) (displayln (format "Error: ~a" (exn-message e)) (current-error-port)))])
    (define data (port->bytes in))
    (define req (bytes->string/utf-8 data))
    (cond
      [(string-prefix? req "GET /health")
       (define json "{\"engine\":\"SWMM5-Racket\",\"status\":\"ok\",\"version\":\"v1.0\",\"language\":\"Racket\"}")
       (fprintf out "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: ~a\r\n\r\n~a" (string-length json) json)]
      [(string-prefix? req "POST /simulate")
       (define header-end (let ([pos (regexp-match-positions #rx"\r\n\r\n" req)]) (if pos (cdar pos) 0)))
       (define body (substring req header-end))
       (define t0 (current-inexact-milliseconds))
       (define mdl (parse-inp body))
       (define-values (steps elapsed) (simulate! mdl))
       (define wall-ms (- (current-inexact-milliseconds) t0))
       (define rpt (generate-rpt mdl steps wall-ms))
       (define json (format "{\"success\":true,\"rpt\":\"~a\"}" (escape-json rpt)))
       (fprintf out "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: ~a\r\n\r\n~a" (string-utf-8-length json) json)]
      [else (fprintf out "HTTP/1.1 404 Not Found\r\n\r\n")]))
  (close-input-port in) (close-output-port out)
  (loop))
