import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ScatterChart, Scatter, CartesianGrid, Legend, ReferenceLine } from "recharts";

// ============================================================
// TINY NEURAL NETWORK (Pure JS, no dependencies)
// ============================================================
class TinyMLP {
  constructor(layerSizes) {
    this.layers = [];
    this.lr = 0.01;
    for (let i = 0; i < layerSizes.length - 1; i++) {
      const rows = layerSizes[i + 1];
      const cols = layerSizes[i];
      const scale = Math.sqrt(2.0 / cols); // He initialization
      this.layers.push({
        W: Array.from({ length: rows }, () =>
          Array.from({ length: cols }, () => (Math.random() * 2 - 1) * scale)
        ),
        b: Array(rows).fill(0),
      });
    }
  }

  relu(x) { return Math.max(0, x); }
  reluDeriv(x) { return x > 0 ? 1 : 0; }

  forward(input) {
    const activations = [input.slice()];
    let current = input.slice();
    for (let l = 0; l < this.layers.length; l++) {
      const { W, b } = this.layers[l];
      const next = [];
      for (let i = 0; i < W.length; i++) {
        let sum = b[i];
        for (let j = 0; j < W[i].length; j++) {
          sum += W[i][j] * current[j];
        }
        // ReLU for hidden, linear for output
        next.push(l < this.layers.length - 1 ? this.relu(sum) : sum);
      }
      activations.push(next);
      current = next;
    }
    return { output: current, activations };
  }

  train(input, target) {
    const { output, activations } = this.forward(input);
    const loss = 0.5 * Math.pow(output[0] - target[0], 2);

    // Backpropagation
    let deltas = [output[0] - target[0]]; // output layer delta (linear)

    for (let l = this.layers.length - 1; l >= 0; l--) {
      const { W, b } = this.layers[l];
      const prevAct = activations[l];

      // Update weights and biases
      for (let i = 0; i < W.length; i++) {
        for (let j = 0; j < W[i].length; j++) {
          W[i][j] -= this.lr * deltas[i] * prevAct[j];
        }
        b[i] -= this.lr * deltas[i];
      }

      // Compute deltas for previous layer (if not input)
      if (l > 0) {
        const newDeltas = [];
        for (let j = 0; j < W[0].length; j++) {
          let sum = 0;
          for (let i = 0; i < W.length; i++) {
            sum += W[i][j] * deltas[i];
          }
          newDeltas.push(sum * this.reluDeriv(activations[l][j]));
        }
        deltas = newDeltas;
      }
    }
    return loss;
  }

  predict(input) {
    return this.forward(input).output;
  }
}

// ============================================================
// MANNING'S EQUATION ENGINE
// ============================================================
function manningFullFlow(n, D, S) {
  // Q = (1.49/n) * A * R^(2/3) * S^(1/2) [US customary, ft, CFS]
  const A = Math.PI * D * D / 4;
  const R = D / 4;
  const Q = (1.49 / n) * A * Math.pow(R, 2 / 3) * Math.pow(S, 0.5);
  const V = Q / A;
  return { Q, V, A, R };
}

function generateTrainingData(count) {
  const data = [];
  for (let i = 0; i < count; i++) {
    const n = 0.010 + Math.random() * 0.020;  // 0.010 to 0.030
    const D = 0.5 + Math.random() * 5.5;       // 0.5 to 6.0 ft
    const S = 0.0005 + Math.random() * 0.0495; // 0.0005 to 0.05
    const { Q, V } = manningFullFlow(n, D, S);
    data.push({ n, D, S, Q, V });
  }
  return data;
}

// Normalization helpers
function normalizeInput(n, D, S) {
  return [
    (n - 0.010) / 0.020,
    (D - 0.5) / 5.5,
    (S - 0.0005) / 0.0495,
  ];
}

function normalizeQ(Q, maxQ) {
  return Q / maxQ;
}

function denormalizeQ(normQ, maxQ) {
  return normQ * maxQ;
}

// ============================================================
// MAIN APP COMPONENT
// ============================================================
export default function ManningsMicroGPT() {
  // Training state
  const [isTraining, setIsTraining] = useState(false);
  const [epoch, setEpoch] = useState(0);
  const [lossHistory, setLossHistory] = useState([]);
  const [trainingData, setTrainingData] = useState(null);
  const [dataCount, setDataCount] = useState(2000);
  const [hiddenSize, setHiddenSize] = useState(32);
  const [learningRate, setLearningRate] = useState(0.005);
  const [maxEpochs, setMaxEpochs] = useState(200);
  const [trainProgress, setTrainProgress] = useState("");
  const [modelReady, setModelReady] = useState(false);

  // Prediction state
  const [testN, setTestN] = useState(0.013);
  const [testD, setTestD] = useState(2.0);
  const [testS, setTestS] = useState(0.005);
  const [prediction, setPrediction] = useState(null);

  // Comparison data
  const [comparisonData, setComparisonData] = useState([]);

  // Tab state
  const [activeTab, setActiveTab] = useState("train");
  const [expandedCode, setExpandedCode] = useState({});

  const modelRef = useRef(null);
  const maxQRef = useRef(1);
  const trainingRef = useRef(false);
  const abortRef = useRef(false);

  // Generate data
  const handleGenerateData = useCallback(() => {
    const data = generateTrainingData(dataCount);
    const maxQ = Math.max(...data.map(d => d.Q));
    maxQRef.current = maxQ;
    setTrainingData(data);
    setLossHistory([]);
    setEpoch(0);
    setModelReady(false);
    setComparisonData([]);
    setTrainProgress(`Generated ${dataCount} samples. Max Q = ${maxQ.toFixed(2)} CFS. Ready to train.`);
  }, [dataCount]);

  // Training loop
  const handleTrain = useCallback(async () => {
    if (!trainingData) return;
    abortRef.current = false;

    const net = new TinyMLP([3, hiddenSize, hiddenSize, 1]);
    net.lr = learningRate;
    modelRef.current = net;
    setIsTraining(true);
    trainingRef.current = true;

    const maxQ = maxQRef.current;
    const losses = [];

    // Shuffle helper
    const shuffle = (arr) => {
      const a = [...arr];
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    };

    for (let ep = 0; ep < maxEpochs; ep++) {
      if (abortRef.current) break;

      const shuffled = shuffle(trainingData);
      let epochLoss = 0;

      for (const sample of shuffled) {
        const input = normalizeInput(sample.n, sample.D, sample.S);
        const target = [normalizeQ(sample.Q, maxQ)];
        epochLoss += net.train(input, target);
      }

      const avgLoss = epochLoss / trainingData.length;
      losses.push({ epoch: ep + 1, loss: avgLoss });

      if (ep % 5 === 0 || ep === maxEpochs - 1) {
        setEpoch(ep + 1);
        setLossHistory([...losses]);
        setTrainProgress(`Epoch ${ep + 1}/${maxEpochs} — Avg Loss: ${avgLoss.toExponential(4)}`);

        // Yield to UI
        await new Promise(r => setTimeout(r, 0));
      }
    }

    setIsTraining(false);
    trainingRef.current = false;
    setModelReady(true);

    // Generate comparison data
    const comp = [];
    for (let i = 0; i < 100; i++) {
      const n = 0.010 + Math.random() * 0.020;
      const D = 0.5 + Math.random() * 5.5;
      const S = 0.0005 + Math.random() * 0.0495;
      const actual = manningFullFlow(n, D, S).Q;
      const pred = denormalizeQ(net.predict(normalizeInput(n, D, S))[0], maxQ);
      comp.push({ actual: +actual.toFixed(2), predicted: +pred.toFixed(2), n, D: +D.toFixed(2), S });
    }
    setComparisonData(comp);
    setTrainProgress(`Training complete! ${maxEpochs} epochs. Test with your own parameters below.`);
  }, [trainingData, hiddenSize, learningRate, maxEpochs]);

  const handleStop = () => {
    abortRef.current = true;
  };

  // Run prediction
  const handlePredict = useCallback(() => {
    if (!modelRef.current) return;
    const input = normalizeInput(testN, testD, testS);
    const normPred = modelRef.current.predict(input)[0];
    const predQ = denormalizeQ(normPred, maxQRef.current);
    const exact = manningFullFlow(testN, testD, testS);
    const error = Math.abs(predQ - exact.Q) / exact.Q * 100;
    setPrediction({ predicted: predQ, exact: exact.Q, velocity: exact.V, error });
  }, [testN, testD, testS]);

  useEffect(() => {
    if (modelReady) handlePredict();
  }, [testN, testD, testS, modelReady, handlePredict]);

  // R² calculation
  const rSquared = useMemo(() => {
    if (comparisonData.length === 0) return null;
    const meanActual = comparisonData.reduce((s, d) => s + d.actual, 0) / comparisonData.length;
    const ssTot = comparisonData.reduce((s, d) => s + Math.pow(d.actual - meanActual, 2), 0);
    const ssRes = comparisonData.reduce((s, d) => s + Math.pow(d.actual - d.predicted, 2), 0);
    return 1 - ssRes / ssTot;
  }, [comparisonData]);

  const meanError = useMemo(() => {
    if (comparisonData.length === 0) return null;
    return comparisonData.reduce((s, d) =>
      s + Math.abs(d.actual - d.predicted) / Math.max(d.actual, 0.001) * 100, 0
    ) / comparisonData.length;
  }, [comparisonData]);

  // Pipe cross-section SVG
  const PipeCrossSection = ({ D, fillFraction = 1.0 }) => {
    const cx = 60, cy = 60, r = 45;
    const waterHeight = r * 2 * fillFraction;
    const waterY = cy + r - waterHeight;
    return (
      <svg width="120" height="120" viewBox="0 0 120 120">
        <defs>
          <clipPath id="pipeClip">
            <circle cx={cx} cy={cy} r={r} />
          </clipPath>
          <linearGradient id="waterGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0.9" />
          </linearGradient>
        </defs>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#78716c" strokeWidth="4" />
        <rect x={cx - r} y={waterY} width={r * 2} height={waterHeight}
          fill="url(#waterGrad)" clipPath="url(#pipeClip)" />
        <text x={cx} y={cy + 2} textAnchor="middle" fontSize="11" fill="#1e293b" fontWeight="600">
          {D.toFixed(1)} ft
        </text>
      </svg>
    );
  };

  const tabClass = (tab) =>
    `px-5 py-2.5 text-sm font-semibold tracking-wide cursor-pointer transition-all duration-200 ${
      activeTab === tab
        ? "text-sky-100 border-b-2 border-sky-300 bg-slate-800/50"
        : "text-slate-400 hover:text-slate-200 border-b-2 border-transparent"
    }`;

  const Stat = ({ label, value, unit, color = "text-sky-300" }) => (
    <div className="bg-slate-800/60 rounded-lg p-3 border border-slate-700/50">
      <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">{label}</div>
      <div className={`text-xl font-bold font-mono ${color}`}>{value}</div>
      {unit && <div className="text-[10px] text-slate-500 mt-0.5">{unit}</div>}
    </div>
  );

  return (
    <div style={{
      background: "linear-gradient(145deg, #0c1222 0%, #0f172a 40%, #0c1a2e 100%)",
      minHeight: "100vh",
      fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', monospace"
    }}>
      {/* Header */}
      <div className="px-6 pt-6 pb-2">
        <div className="flex items-center gap-3 mb-1">
          <div style={{
            width: 36, height: 36, borderRadius: 8,
            background: "linear-gradient(135deg, #0ea5e9, #2563eb)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18, fontWeight: 800, color: "white",
            boxShadow: "0 0 20px rgba(14,165,233,0.3)"
          }}>Q</div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Manning's MicroGPT
            </h1>
            <p className="text-[11px] text-slate-500 tracking-wide">
              Train a Neural Network to Learn Pipe Flow Physics
            </p>
          </div>
        </div>

        {/* Equation display */}
        <div className="mt-3 px-4 py-2.5 bg-slate-800/40 rounded-lg border border-slate-700/40 text-center">
          <span className="text-sky-400 text-sm font-semibold tracking-wide">
            Q = (1.49/n) &middot; A &middot; R
            <sup style={{ fontSize: 9 }}>2/3</sup> &middot; S
            <sup style={{ fontSize: 9 }}>1/2</sup>
          </span>
          <span className="text-slate-600 text-xs ml-3">US Customary &middot; Full Circular Pipe</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 px-4 mt-3">
        <button className={tabClass("train")} onClick={() => setActiveTab("train")}>1. Generate &amp; Train</button>
        <button className={tabClass("test")} onClick={() => setActiveTab("test")}>2. Test Predictions</button>
        <button className={tabClass("analysis")} onClick={() => setActiveTab("analysis")}>3. Analysis</button>
        <button className={tabClass("docs")} onClick={() => setActiveTab("docs")}>4. Docs</button>
      </div>

      <div className="px-6 py-4">

        {/* ===================== TAB 1: TRAIN ===================== */}
        {activeTab === "train" && (
          <div>
            {/* Config controls */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="text-[10px] uppercase tracking-widest text-slate-500 block mb-1">Training Samples</label>
                <input type="range" min={500} max={5000} step={500} value={dataCount}
                  onChange={e => setDataCount(+e.target.value)}
                  className="w-full accent-sky-500" />
                <span className="text-sky-400 text-xs font-mono">{dataCount}</span>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-widest text-slate-500 block mb-1">Hidden Layer Size</label>
                <input type="range" min={8} max={64} step={8} value={hiddenSize}
                  onChange={e => setHiddenSize(+e.target.value)}
                  className="w-full accent-sky-500" />
                <span className="text-sky-400 text-xs font-mono">{hiddenSize} neurons</span>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-widest text-slate-500 block mb-1">Learning Rate</label>
                <input type="range" min={0.001} max={0.02} step={0.001} value={learningRate}
                  onChange={e => setLearningRate(+e.target.value)}
                  className="w-full accent-sky-500" />
                <span className="text-sky-400 text-xs font-mono">{learningRate.toFixed(3)}</span>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-widest text-slate-500 block mb-1">Max Epochs</label>
                <input type="range" min={50} max={500} step={50} value={maxEpochs}
                  onChange={e => setMaxEpochs(+e.target.value)}
                  className="w-full accent-sky-500" />
                <span className="text-sky-400 text-xs font-mono">{maxEpochs}</span>
              </div>
            </div>

            {/* Network architecture diagram */}
            <div className="bg-slate-800/30 rounded-lg p-3 mb-4 border border-slate-700/30">
              <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-2">Network Architecture</div>
              <div className="flex items-center justify-center gap-2 text-xs">
                <div className="flex flex-col items-center gap-1">
                  <div className="text-slate-500 text-[9px]">INPUT</div>
                  {["n", "D", "S"].map(p => (
                    <div key={p} className="w-8 h-8 rounded-full border border-emerald-500/50 bg-emerald-500/10 flex items-center justify-center text-emerald-400 text-[10px] font-bold">{p}</div>
                  ))}
                </div>
                <div className="text-slate-600 text-lg">&rarr;</div>
                <div className="flex flex-col items-center gap-0.5">
                  <div className="text-slate-500 text-[9px]">HIDDEN 1</div>
                  <div className="w-14 h-14 rounded-lg border border-sky-500/30 bg-sky-500/10 flex items-center justify-center text-sky-400 text-[10px]">{hiddenSize}<br />ReLU</div>
                </div>
                <div className="text-slate-600 text-lg">&rarr;</div>
                <div className="flex flex-col items-center gap-0.5">
                  <div className="text-slate-500 text-[9px]">HIDDEN 2</div>
                  <div className="w-14 h-14 rounded-lg border border-sky-500/30 bg-sky-500/10 flex items-center justify-center text-sky-400 text-[10px]">{hiddenSize}<br />ReLU</div>
                </div>
                <div className="text-slate-600 text-lg">&rarr;</div>
                <div className="flex flex-col items-center gap-1">
                  <div className="text-slate-500 text-[9px]">OUTPUT</div>
                  <div className="w-8 h-8 rounded-full border border-amber-500/50 bg-amber-500/10 flex items-center justify-center text-amber-400 text-[10px] font-bold">Q</div>
                </div>
              </div>
              <div className="text-center text-slate-600 text-[10px] mt-2">
                {3 * hiddenSize + hiddenSize + hiddenSize * hiddenSize + hiddenSize + hiddenSize * 1 + 1} total parameters
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3 mb-4">
              <button
                onClick={handleGenerateData}
                disabled={isTraining}
                className="flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold tracking-wide transition-all"
                style={{
                  background: isTraining ? "#334155" : "linear-gradient(135deg, #059669, #10b981)",
                  color: isTraining ? "#64748b" : "white",
                  cursor: isTraining ? "not-allowed" : "pointer",
                  boxShadow: isTraining ? "none" : "0 0 15px rgba(16,185,129,0.3)"
                }}>
                Generate Data
              </button>
              <button
                onClick={isTraining ? handleStop : handleTrain}
                disabled={!trainingData && !isTraining}
                className="flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold tracking-wide transition-all"
                style={{
                  background: !trainingData ? "#334155" : isTraining
                    ? "linear-gradient(135deg, #dc2626, #ef4444)"
                    : "linear-gradient(135deg, #0ea5e9, #2563eb)",
                  color: !trainingData ? "#64748b" : "white",
                  cursor: !trainingData ? "not-allowed" : "pointer",
                  boxShadow: !trainingData ? "none" : "0 0 15px rgba(14,165,233,0.3)"
                }}>
                {isTraining ? "Stop Training" : "Train Network"}
              </button>
            </div>

            {/* Status */}
            {trainProgress && (
              <div className="text-xs text-slate-400 bg-slate-800/40 rounded-lg px-3 py-2 mb-4 border border-slate-700/30 font-mono">
                {trainProgress}
              </div>
            )}

            {/* Loss chart */}
            {lossHistory.length > 0 && (
              <div className="bg-slate-800/30 rounded-lg p-4 border border-slate-700/30">
                <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-3">Training Loss (MSE)</div>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={lossHistory}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="epoch" stroke="#475569" tick={{ fontSize: 10 }}
                      label={{ value: "Epoch", position: "insideBottom", offset: -5, fill: "#64748b", fontSize: 10 }} />
                    <YAxis stroke="#475569" tick={{ fontSize: 10 }} tickFormatter={v => v.toExponential(1)}
                      label={{ value: "Loss", angle: -90, position: "insideLeft", fill: "#64748b", fontSize: 10 }} />
                    <Line type="monotone" dataKey="loss" stroke="#0ea5e9" strokeWidth={2} dot={false}
                      animationDuration={0} />
                    <Tooltip
                      contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8, fontSize: 11 }}
                      labelStyle={{ color: "#94a3b8" }}
                      formatter={(v) => [v.toExponential(4), "Loss"]} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Sample training data preview */}
            {trainingData && (
              <div className="mt-4 bg-slate-800/30 rounded-lg p-3 border border-slate-700/30">
                <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-2">Sample Training Data (first 8)</div>
                <div className="overflow-x-auto">
                  <table className="w-full text-[11px] text-slate-300">
                    <thead>
                      <tr className="text-slate-500 border-b border-slate-700/50">
                        <th className="text-left py-1 px-2">n</th>
                        <th className="text-left py-1 px-2">D (ft)</th>
                        <th className="text-left py-1 px-2">S (ft/ft)</th>
                        <th className="text-left py-1 px-2">Q (CFS)</th>
                        <th className="text-left py-1 px-2">V (ft/s)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {trainingData.slice(0, 8).map((d, i) => (
                        <tr key={i} className="border-b border-slate-800/50">
                          <td className="py-1 px-2 text-emerald-400">{d.n.toFixed(4)}</td>
                          <td className="py-1 px-2 text-emerald-400">{d.D.toFixed(2)}</td>
                          <td className="py-1 px-2 text-emerald-400">{d.S.toFixed(5)}</td>
                          <td className="py-1 px-2 text-amber-400 font-semibold">{d.Q.toFixed(2)}</td>
                          <td className="py-1 px-2 text-sky-400">{d.V.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===================== TAB 2: TEST ===================== */}
        {activeTab === "test" && (
          <div>
            {!modelReady ? (
              <div className="text-center py-12">
                <div className="text-slate-500 text-sm">Train the network first (Tab 1)</div>
                <div className="text-slate-600 text-xs mt-2">Generate data, then click Train</div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  {/* n slider */}
                  <div className="bg-slate-800/40 rounded-lg p-3 border border-slate-700/30">
                    <label className="text-[10px] uppercase tracking-widest text-slate-500 block mb-2">
                      Manning's n
                    </label>
                    <input type="range" min={0.010} max={0.030} step={0.001} value={testN}
                      onChange={e => setTestN(+e.target.value)}
                      className="w-full accent-emerald-500" />
                    <div className="text-emerald-400 text-lg font-mono font-bold mt-1">{testN.toFixed(3)}</div>
                    <div className="text-[9px] text-slate-600 mt-1">
                      {testN <= 0.013 ? "Smooth (PVC/concrete)" : testN <= 0.020 ? "Medium (clay/old concrete)" : "Rough (corrugated)"}
                    </div>
                  </div>

                  {/* D slider */}
                  <div className="bg-slate-800/40 rounded-lg p-3 border border-slate-700/30">
                    <label className="text-[10px] uppercase tracking-widest text-slate-500 block mb-2">
                      Diameter (ft)
                    </label>
                    <input type="range" min={0.5} max={6.0} step={0.25} value={testD}
                      onChange={e => setTestD(+e.target.value)}
                      className="w-full accent-emerald-500" />
                    <div className="text-emerald-400 text-lg font-mono font-bold mt-1">{testD.toFixed(2)}</div>
                    <div className="flex justify-center mt-1">
                      <PipeCrossSection D={testD} />
                    </div>
                  </div>

                  {/* S slider */}
                  <div className="bg-slate-800/40 rounded-lg p-3 border border-slate-700/30">
                    <label className="text-[10px] uppercase tracking-widest text-slate-500 block mb-2">
                      Slope (ft/ft)
                    </label>
                    <input type="range" min={0.0005} max={0.05} step={0.0005} value={testS}
                      onChange={e => setTestS(+e.target.value)}
                      className="w-full accent-emerald-500" />
                    <div className="text-emerald-400 text-lg font-mono font-bold mt-1">{testS.toFixed(4)}</div>
                    <div className="text-[9px] text-slate-600 mt-1">
                      {(testS * 100).toFixed(2)}% grade
                    </div>
                  </div>
                </div>

                {/* Results comparison */}
                {prediction && (
                  <div className="grid grid-cols-4 gap-3 mb-4">
                    <Stat label="AI Predicted Q" value={prediction.predicted.toFixed(2)} unit="CFS" color="text-sky-300" />
                    <Stat label="Exact Manning's Q" value={prediction.exact.toFixed(2)} unit="CFS" color="text-emerald-400" />
                    <Stat label="Prediction Error" value={prediction.error.toFixed(2) + "%"} unit=""
                      color={prediction.error < 5 ? "text-green-400" : prediction.error < 15 ? "text-amber-400" : "text-red-400"} />
                    <Stat label="Velocity" value={prediction.velocity.toFixed(2)} unit="ft/s" color="text-purple-400" />
                  </div>
                )}

                {/* Visual bar comparison */}
                {prediction && (
                  <div className="bg-slate-800/30 rounded-lg p-4 border border-slate-700/30 mb-4">
                    <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-3">Visual Comparison</div>
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                          <span>AI Prediction</span>
                          <span className="text-sky-400">{prediction.predicted.toFixed(2)} CFS</span>
                        </div>
                        <div className="h-5 bg-slate-700/50 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${Math.min(100, prediction.predicted / Math.max(prediction.predicted, prediction.exact) * 100)}%`,
                              background: "linear-gradient(90deg, #0ea5e9, #38bdf8)"
                            }} />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                          <span>Manning's Equation (exact)</span>
                          <span className="text-emerald-400">{prediction.exact.toFixed(2)} CFS</span>
                        </div>
                        <div className="h-5 bg-slate-700/50 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${Math.min(100, prediction.exact / Math.max(prediction.predicted, prediction.exact) * 100)}%`,
                              background: "linear-gradient(90deg, #059669, #34d399)"
                            }} />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Quick presets */}
                <div className="bg-slate-800/30 rounded-lg p-3 border border-slate-700/30">
                  <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-2">Quick Presets</div>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { label: "8\" PVC @ 1%", n: 0.011, D: 0.667, S: 0.01 },
                      { label: "12\" Concrete @ 0.5%", n: 0.013, D: 1.0, S: 0.005 },
                      { label: "24\" RCP @ 0.2%", n: 0.013, D: 2.0, S: 0.002 },
                      { label: "36\" Clay @ 0.3%", n: 0.015, D: 3.0, S: 0.003 },
                      { label: "48\" CMP @ 2%", n: 0.024, D: 4.0, S: 0.02 },
                      { label: "72\" Concrete @ 0.1%", n: 0.013, D: 6.0, S: 0.001 },
                    ].map(p => (
                      <button key={p.label}
                        onClick={() => { setTestN(p.n); setTestD(p.D); setTestS(p.S); }}
                        className="px-3 py-1.5 text-[10px] rounded-md bg-slate-700/50 text-slate-300 hover:bg-sky-500/20 hover:text-sky-300 border border-slate-600/30 transition-all cursor-pointer">
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ===================== TAB 3: ANALYSIS ===================== */}
        {activeTab === "analysis" && (
          <div>
            {comparisonData.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-slate-500 text-sm">Train the network first (Tab 1)</div>
              </div>
            ) : (
              <>
                {/* Summary stats */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <Stat label="R² Score" value={rSquared ? rSquared.toFixed(4) : "—"} unit="coefficient of determination"
                    color={rSquared > 0.99 ? "text-green-400" : rSquared > 0.95 ? "text-amber-400" : "text-red-400"} />
                  <Stat label="Mean Abs Error" value={meanError ? meanError.toFixed(2) + "%" : "—"} unit="across 100 test points"
                    color={meanError < 5 ? "text-green-400" : meanError < 15 ? "text-amber-400" : "text-red-400"} />
                  <Stat label="Test Samples" value="100" unit="random unseen points" color="text-sky-300" />
                </div>

                {/* Scatter plot: predicted vs actual */}
                <div className="bg-slate-800/30 rounded-lg p-4 border border-slate-700/30 mb-4">
                  <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-3">
                    Predicted vs Actual Flow (100 test points)
                  </div>
                  <ResponsiveContainer width="100%" height={300}>
                    <ScatterChart>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis type="number" dataKey="actual" name="Actual Q" unit=" CFS"
                        stroke="#475569" tick={{ fontSize: 10 }}
                        label={{ value: "Actual Q (CFS)", position: "insideBottom", offset: -5, fill: "#64748b", fontSize: 10 }} />
                      <YAxis type="number" dataKey="predicted" name="Predicted Q" unit=" CFS"
                        stroke="#475569" tick={{ fontSize: 10 }}
                        label={{ value: "Predicted Q (CFS)", angle: -90, position: "insideLeft", fill: "#64748b", fontSize: 10 }} />
                      <Tooltip
                        contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8, fontSize: 11 }}
                        formatter={(v, name) => [v.toFixed(2) + " CFS", name]}
                        labelFormatter={() => ""} />
                      <ReferenceLine
                        segment={[{ x: 0, y: 0 }, { x: Math.max(...comparisonData.map(d => d.actual)), y: Math.max(...comparisonData.map(d => d.actual)) }]}
                        stroke="#059669" strokeDasharray="5 5" strokeWidth={1} />
                      <Scatter data={comparisonData} fill="#38bdf8" fillOpacity={0.7} r={3} />
                    </ScatterChart>
                  </ResponsiveContainer>
                  <div className="text-center text-[10px] text-slate-600 mt-1">
                    Dashed green line = perfect prediction. Points closer to line = better accuracy.
                  </div>
                </div>

                {/* What the AI learned */}
                <div className="bg-slate-800/30 rounded-lg p-4 border border-slate-700/30">
                  <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-2">What the Neural Network Learned</div>
                  <div className="text-xs text-slate-400 space-y-2">
                    <p>The network learned these physical relationships from raw data alone:</p>
                    <div className="grid grid-cols-3 gap-3 mt-3">
                      <div className="bg-slate-900/50 rounded p-2.5 border border-slate-700/30">
                        <div className="text-emerald-400 font-semibold text-[11px] mb-1">Q ~ 1/n</div>
                        <div className="text-[10px] text-slate-500">Flow decreases as roughness increases (inverse relationship)</div>
                      </div>
                      <div className="bg-slate-900/50 rounded p-2.5 border border-slate-700/30">
                        <div className="text-emerald-400 font-semibold text-[11px] mb-1">Q ~ D^(8/3)</div>
                        <div className="text-[10px] text-slate-500">Flow increases rapidly with diameter (power law, strongest factor)</div>
                      </div>
                      <div className="bg-slate-900/50 rounded p-2.5 border border-slate-700/30">
                        <div className="text-emerald-400 font-semibold text-[11px] mb-1">Q ~ S^(1/2)</div>
                        <div className="text-[10px] text-slate-500">Flow increases with square root of slope (moderate effect)</div>
                      </div>
                    </div>
                    <p className="mt-3 text-slate-500 text-[10px]">
                      Combined: Q = (1.49/n) &middot; (&pi;/4) &middot; D&sup2; &middot; (D/4)^(2/3) &middot; S^(1/2) &mdash;
                      the network approximated this without being told the equation.
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ===================== TAB 4: DOCS ===================== */}
        {activeTab === "docs" && (
          <div className="space-y-4">

            {/* Overview */}
            <div className="bg-slate-800/30 rounded-lg p-5 border border-slate-700/30">
              <h2 className="text-base font-bold text-sky-300 mb-3" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                How Manning's MicroGPT Works
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed mb-3">
                This app trains a tiny neural network (a "micro GPT") to learn Manning's equation for full-pipe flow
                entirely from data — no equation is given to the network. It discovers the physics on its own through
                gradient descent, the same fundamental algorithm behind ChatGPT and all modern AI.
              </p>
              <p className="text-xs text-slate-400 leading-relaxed">
                The key insight: instead of parsing complex SWMM .inp files for AI training, we use Manning's equation
                as a <span className="text-sky-400">closed-form oracle</span> to generate unlimited, perfectly labeled training data.
                Three inputs (roughness n, diameter D, slope S) map to one output (flow Q). The network must learn the nonlinear
                relationship Q = (1.49/n) × A × R<sup>2/3</sup> × S<sup>1/2</sup> purely from examples.
              </p>
            </div>

            {/* Pipeline diagram */}
            <div className="bg-slate-800/30 rounded-lg p-5 border border-slate-700/30">
              <h3 className="text-sm font-bold text-sky-300 mb-3">The 5-Step Pipeline</h3>
              <div className="space-y-1">
                {[
                  { step: "1", title: "Generate Data", desc: "Random (n, D, S) triplets → compute exact Q via Manning's equation", color: "emerald" },
                  { step: "2", title: "Normalize", desc: "Scale all inputs to [0,1] and Q to [0,1] by dividing by max Q", color: "sky" },
                  { step: "3", title: "Build Network", desc: "Create a 3-layer MLP: [3 → hidden → hidden → 1] with ReLU activations", color: "violet" },
                  { step: "4", title: "Train (Backprop)", desc: "For each epoch: shuffle data, forward pass, compute loss, backward pass, update weights", color: "amber" },
                  { step: "5", title: "Validate", desc: "Test on 100 unseen random points, compute R² and scatter plot", color: "rose" },
                ].map(({ step, title, desc, color }) => (
                  <div key={step} className="flex items-start gap-3 py-2">
                    <div className={`w-7 h-7 rounded-full bg-${color}-500/15 border border-${color}-500/30 flex items-center justify-center text-${color}-400 text-[11px] font-bold flex-shrink-0`}>
                      {step}
                    </div>
                    <div>
                      <div className={`text-${color}-400 text-xs font-semibold`}>{title}</div>
                      <div className="text-[11px] text-slate-500">{desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Source Code Sections */}
            <div className="bg-slate-800/30 rounded-lg p-5 border border-slate-700/30">
              <h3 className="text-sm font-bold text-sky-300 mb-3">Source Code — Annotated</h3>

              {/* Section 1: Manning's Equation */}
              {(() => {
                const sections = [
                  {
                    id: "manning",
                    title: "Manning's Equation (the Oracle)",
                    description: "This is the ground truth. For a full circular pipe in US customary units, the flow Q depends on roughness coefficient n, pipe diameter D, and slope S. We use this to generate perfect training labels.",
                    code: `function manningFullFlow(n, D, S) {
  // Q = (1.49/n) * A * R^(2/3) * S^(1/2)
  // US customary units: ft, CFS
  const A = Math.PI * D * D / 4;   // Full-pipe area (ft²)
  const R = D / 4;                  // Hydraulic radius = D/4 for full pipe
  const Q = (1.49 / n) * A * Math.pow(R, 2/3) * Math.pow(S, 0.5);
  const V = Q / A;                  // Velocity (ft/s)
  return { Q, V, A, R };
}`
                  },
                  {
                    id: "datagen",
                    title: "Training Data Generator",
                    description: "Randomly sample n, D, S across realistic pipe ranges. Each sample gets a perfect Q label from Manning's equation. This is why closed-form equations are ideal for AI training demos — infinite free labeled data.",
                    code: `function generateTrainingData(count) {
  const data = [];
  for (let i = 0; i < count; i++) {
    const n = 0.010 + Math.random() * 0.020;  // 0.010–0.030
    const D = 0.5 + Math.random() * 5.5;      // 0.5–6.0 ft
    const S = 0.0005 + Math.random() * 0.0495; // 0.05%–5% grade
    const { Q, V } = manningFullFlow(n, D, S);
    data.push({ n, D, S, Q, V });
  }
  return data;
}`
                  },
                  {
                    id: "normalize",
                    title: "Input/Output Normalization",
                    description: "Neural networks train best when inputs and outputs are in similar ranges. We map each input to [0,1] using the known min/max of our parameter ranges, and normalize Q by dividing by the maximum observed Q in the dataset.",
                    code: `function normalizeInput(n, D, S) {
  return [
    (n - 0.010) / 0.020,    // n: [0.010, 0.030] → [0, 1]
    (D - 0.5) / 5.5,        // D: [0.5, 6.0]     → [0, 1]
    (S - 0.0005) / 0.0495,  // S: [0.0005, 0.05]  → [0, 1]
  ];
}
function normalizeQ(Q, maxQ)   { return Q / maxQ; }
function denormalizeQ(nQ, maxQ) { return nQ * maxQ; }`
                  },
                  {
                    id: "network",
                    title: "Neural Network — TinyMLP Class",
                    description: "A from-scratch multilayer perceptron in pure JavaScript (no TensorFlow/PyTorch). Uses He initialization (scale weights by √(2/fan_in)) for stable training. ReLU activation on hidden layers, linear output. The constructor builds weight matrices and bias vectors for each layer connection.",
                    code: `class TinyMLP {
  constructor(layerSizes) {
    // layerSizes = [3, 32, 32, 1]
    this.layers = [];
    this.lr = 0.01;
    for (let i = 0; i < layerSizes.length - 1; i++) {
      const rows = layerSizes[i + 1];  // neurons in next layer
      const cols = layerSizes[i];       // neurons in current layer
      const scale = Math.sqrt(2.0 / cols); // He init
      this.layers.push({
        W: /* rows × cols random matrix, scaled */,
        b: /* rows-length zero vector */,
      });
    }
  }
  relu(x) { return Math.max(0, x); }
  reluDeriv(x) { return x > 0 ? 1 : 0; }
}`
                  },
                  {
                    id: "forward",
                    title: "Forward Pass",
                    description: "Data flows input → hidden1 → hidden2 → output. Each layer computes: output = activation(W × input + b). Hidden layers use ReLU (max(0, x)) which lets the network learn nonlinear functions. The output layer is linear (no activation) since Q can be any positive value.",
                    code: `forward(input) {
  const activations = [input.slice()]; // save for backprop
  let current = input;
  for (let l = 0; l < this.layers.length; l++) {
    const { W, b } = this.layers[l];
    const next = [];
    for (let i = 0; i < W.length; i++) {
      let sum = b[i];
      for (let j = 0; j < W[i].length; j++)
        sum += W[i][j] * current[j];
      // ReLU for hidden layers, linear for output
      next.push(l < this.layers.length - 1
        ? Math.max(0, sum) : sum);
    }
    activations.push(next);
    current = next;
  }
  return { output: current, activations };
}`
                  },
                  {
                    id: "backprop",
                    title: "Backpropagation (Learning)",
                    description: "The heart of training. After a forward pass, we compute the error (predicted - actual), then propagate gradients backward through each layer using the chain rule. Weights are nudged in the direction that reduces the error by: W -= learning_rate × gradient. This is identical to how GPT-4 trains, just much smaller scale.",
                    code: `train(input, target) {
  const { output, activations } = this.forward(input);
  const loss = 0.5 * (output[0] - target[0]) ** 2; // MSE

  // Output layer delta (linear activation)
  let deltas = [output[0] - target[0]];

  // Walk backward through layers
  for (let l = this.layers.length - 1; l >= 0; l--) {
    const { W, b } = this.layers[l];
    const prevAct = activations[l];
    // Update: W[i][j] -= lr * delta[i] * prevActivation[j]
    for (let i = 0; i < W.length; i++) {
      for (let j = 0; j < W[i].length; j++)
        W[i][j] -= this.lr * deltas[i] * prevAct[j];
      b[i] -= this.lr * deltas[i];
    }
    // Propagate deltas to previous layer
    if (l > 0) {
      newDeltas[j] = sum(W[i][j] * deltas[i]) * reluDeriv(...)
    }
  }
  return loss;
}`
                  },
                  {
                    id: "trainloop",
                    title: "Training Loop",
                    description: "Each epoch: shuffle all training data (prevents learning order-dependent patterns), run every sample through forward + backward pass, accumulate average loss. The loss curve you see in Tab 1 plots this average MSE per epoch. Shuffling every epoch is critical — without it, the network can get stuck in poor local minima.",
                    code: `for (let ep = 0; ep < maxEpochs; ep++) {
  const shuffled = shuffle(trainingData);
  let epochLoss = 0;

  for (const sample of shuffled) {
    const input = normalizeInput(sample.n, sample.D, sample.S);
    const target = [normalizeQ(sample.Q, maxQ)];
    epochLoss += net.train(input, target);
  }

  const avgLoss = epochLoss / trainingData.length;
  lossHistory.push({ epoch: ep + 1, loss: avgLoss });

  // Yield to browser every 5 epochs for UI updates
  if (ep % 5 === 0) await new Promise(r => setTimeout(r, 0));
}`
                  },
                  {
                    id: "validation",
                    title: "Validation & R² Score",
                    description: "After training, we test on 100 fresh random points the network has never seen. R² (coefficient of determination) measures how much variance the model explains: 1.0 = perfect, 0.0 = predicts the mean. A good training run with 2000 samples and 200 epochs typically achieves R² > 0.98.",
                    code: `// Generate 100 unseen test points
for (let i = 0; i < 100; i++) {
  const n = 0.010 + Math.random() * 0.020;
  const D = 0.5 + Math.random() * 5.5;
  const S = 0.0005 + Math.random() * 0.0495;
  const actual = manningFullFlow(n, D, S).Q;
  const predicted = denormalizeQ(
    net.predict(normalizeInput(n, D, S))[0], maxQ);
  testPoints.push({ actual, predicted });
}

// R² = 1 - SS_res / SS_tot
const mean = avg(testPoints.map(d => d.actual));
const ssTot = sum((d.actual - mean)²);
const ssRes = sum((d.actual - d.predicted)²);
const rSquared = 1 - ssRes / ssTot;`
                  }
                ];

                const toggleCode = (id) => setExpandedCode(prev => ({ ...prev, [id]: !prev[id] }));

                return (
                  <div className="space-y-3">
                    {sections.map(({ id, title, description, code }) => (
                      <div key={id} className="bg-slate-900/40 rounded-lg border border-slate-700/20 overflow-hidden">
                        <button
                          onClick={() => toggleCode(id)}
                          className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-800/40 transition-colors cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-sky-500 text-xs font-mono">{'{ }'}</span>
                            <span className="text-slate-200 text-xs font-semibold">{title}</span>
                          </div>
                          <span className="text-slate-500 text-xs">{expandedCode[id] ? '▼' : '▶'}</span>
                        </button>

                        <div className="px-4 pb-3">
                          <p className="text-[11px] text-slate-500 leading-relaxed">{description}</p>
                        </div>

                        {expandedCode[id] && (
                          <div className="mx-3 mb-3 rounded-lg overflow-hidden">
                            <div className="bg-slate-950/80 px-4 py-3 overflow-x-auto">
                              <pre className="text-[10px] leading-relaxed text-slate-300 font-mono whitespace-pre">{code}</pre>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            {/* Key Concepts */}
            <div className="bg-slate-800/30 rounded-lg p-5 border border-slate-700/30">
              <h3 className="text-sm font-bold text-sky-300 mb-3">Key Concepts Explained</h3>
              <div className="space-y-4">

                <div>
                  <h4 className="text-xs font-semibold text-amber-400 mb-1">Why Not Train on .inp Files?</h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    SWMM .inp files are complex multi-section text files with interdependent parameters, mixed formats (keywords, tables, geometry),
                    and no single "right answer" per input set. A tiny network can't learn meaningful patterns from such complexity.
                    Manning's equation gives us a <span className="text-slate-300">pure signal</span>: three numbers in, one number out,
                    with a deterministic relationship. The network can focus entirely on learning the physics.
                  </p>
                </div>

                <div>
                  <h4 className="text-xs font-semibold text-amber-400 mb-1">He Initialization</h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Weights are initialized as random values scaled by √(2/fan_in), where fan_in is the number of inputs to each neuron.
                    This keeps signals from exploding or vanishing as they pass through layers. Named after Kaiming He (2015), this is standard
                    for ReLU networks. Without it, deep networks often fail to train at all.
                  </p>
                </div>

                <div>
                  <h4 className="text-xs font-semibold text-amber-400 mb-1">ReLU Activation</h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    ReLU(x) = max(0, x). Dead simple, but it lets the network approximate any continuous function by composing
                    piecewise-linear segments. For Manning's equation, the network builds up the nonlinear D<sup>8/3</sup> and S<sup>1/2</sup> relationships
                    from many small linear pieces — like approximating a curve with tiny straight lines.
                  </p>
                </div>

                <div>
                  <h4 className="text-xs font-semibold text-amber-400 mb-1">Why Normalization Matters</h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Raw inputs have very different scales: n ~ 0.01, D ~ 3.0, S ~ 0.005, Q ~ 0 to 500+.
                    Without normalization, the gradient signal is dominated by the largest-magnitude inputs, and the network
                    basically ignores n and S. Mapping everything to [0,1] gives each parameter equal influence during training.
                  </p>
                </div>

                <div>
                  <h4 className="text-xs font-semibold text-amber-400 mb-1">Same Algorithm as GPT — Just Smaller</h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    GPT-4 and this app both use: (1) forward pass to compute predictions, (2) loss function to measure error,
                    (3) backpropagation to compute gradients, (4) gradient descent to update weights. The difference?
                    GPT-4 has ~1.8 trillion parameters across transformer layers. Our network has ~1,200 parameters across
                    3 dense layers. Same math, 10<sup>9</sup>× smaller.
                  </p>
                </div>
              </div>
            </div>

            {/* Physical relationships the network learns */}
            <div className="bg-slate-800/30 rounded-lg p-5 border border-slate-700/30">
              <h3 className="text-sm font-bold text-sky-300 mb-3">What Physics Does the Network Discover?</h3>
              <p className="text-[11px] text-slate-500 leading-relaxed mb-3">
                For a full circular pipe, Manning's equation simplifies to:
              </p>
              <div className="bg-slate-950/60 rounded-lg p-3 text-center mb-3">
                <span className="text-sky-400 text-sm font-mono">
                  Q = (1.49 &middot; &pi;) / (4 &middot; 4<sup>2/3</sup>) &middot; n<sup>-1</sup> &middot; D<sup>8/3</sup> &middot; S<sup>1/2</sup>
                </span>
              </div>
              <div className="space-y-2">
                <div className="flex items-start gap-3">
                  <span className="text-emerald-400 text-xs font-mono font-bold w-20 flex-shrink-0">n → Q</span>
                  <span className="text-[11px] text-slate-500">Inverse relationship (Q ∝ 1/n). Doubling roughness halves flow. The network learns this as a steep negative gradient in the n-input weights.</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-emerald-400 text-xs font-mono font-bold w-20 flex-shrink-0">D → Q</span>
                  <span className="text-[11px] text-slate-500">Power law with exponent 8/3 ≈ 2.67. This is the dominant factor — a 6 ft pipe carries ~100× more than a 1 ft pipe. The network needs multiple ReLU segments to approximate this steep curve.</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-emerald-400 text-xs font-mono font-bold w-20 flex-shrink-0">S → Q</span>
                  <span className="text-[11px] text-slate-500">Square root relationship (Q ∝ √S). Moderate effect — quadrupling slope only doubles flow. This sub-linear curve is easier for the network to approximate.</span>
                </div>
              </div>
            </div>

            {/* Tuning guide */}
            <div className="bg-slate-800/30 rounded-lg p-5 border border-slate-700/30">
              <h3 className="text-sm font-bold text-sky-300 mb-3">Tuning Guide</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-[11px] text-slate-400">
                  <thead>
                    <tr className="text-slate-500 border-b border-slate-700/50 text-left">
                      <th className="py-2 px-2">Parameter</th>
                      <th className="py-2 px-2">Effect of Increase</th>
                      <th className="py-2 px-2">Recommended</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ["Training Samples", "Better coverage of parameter space, slower epochs", "2000–3000"],
                      ["Hidden Size", "More capacity for complex patterns, risk of overfitting", "24–48"],
                      ["Learning Rate", "Faster convergence, but can overshoot and diverge", "0.003–0.008"],
                      ["Max Epochs", "More training passes, diminishing returns after convergence", "150–300"],
                    ].map(([param, effect, rec], i) => (
                      <tr key={i} className="border-b border-slate-800/40">
                        <td className="py-2 px-2 text-sky-400 font-semibold">{param}</td>
                        <td className="py-2 px-2">{effect}</td>
                        <td className="py-2 px-2 text-emerald-400 font-mono">{rec}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Inspiration — Karpathy */}
            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-lg p-5 border border-slate-600/30">
              <h3 className="text-sm font-bold text-sky-300 mb-2">Inspired By — Andrej Karpathy</h3>
              <p className="text-[11px] text-slate-400 leading-relaxed mb-4">
                This app draws directly from Andrej Karpathy's philosophy of building neural networks from scratch
                to understand how they work. The TinyMLP class in this app implements the same forward pass, backpropagation,
                and gradient descent concepts taught in his legendary open-source repos and YouTube lectures.
              </p>

              <div className="space-y-3">
                {/* micrograd */}
                <a href="https://github.com/karpathy/micrograd" target="_blank" rel="noopener noreferrer"
                  className="block bg-slate-900/60 rounded-lg p-3 border border-slate-700/30 hover:border-sky-500/40 transition-all group cursor-pointer">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 text-sm font-bold flex-shrink-0 group-hover:bg-amber-500/20 transition-colors">
                      &mu;g
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-200 text-xs font-semibold group-hover:text-sky-300 transition-colors">karpathy/micrograd</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">Most Relevant</span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                        A tiny scalar-valued autograd engine and neural net library with a PyTorch-like API.
                        Our TinyMLP is essentially a JavaScript port of micrograd's concepts — forward pass, backprop, and SGD
                        in ~100 lines of code. The entire library is only 2 files.
                      </p>
                      <span className="text-[9px] text-sky-500/70 mt-1 inline-block">github.com/karpathy/micrograd ↗</span>
                    </div>
                  </div>
                </a>

                {/* nanoGPT */}
                <a href="https://github.com/karpathy/nanoGPT" target="_blank" rel="noopener noreferrer"
                  className="block bg-slate-900/60 rounded-lg p-3 border border-slate-700/30 hover:border-sky-500/40 transition-all group cursor-pointer">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-sm font-bold flex-shrink-0 group-hover:bg-emerald-500/20 transition-colors">
                      nG
                    </div>
                    <div className="flex-1">
                      <div className="text-slate-200 text-xs font-semibold group-hover:text-sky-300 transition-colors">karpathy/nanoGPT</div>
                      <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                        The simplest, fastest repository for training/finetuning medium-sized GPTs.
                        A ~300-line training loop + ~300-line model definition that reproduces GPT-2 (124M).
                        Shows the same train loop pattern we use (shuffle, forward, loss, backward, update) at production scale.
                      </p>
                      <span className="text-[9px] text-sky-500/70 mt-1 inline-block">github.com/karpathy/nanoGPT ↗</span>
                    </div>
                  </div>
                </a>

                {/* build-nanogpt */}
                <a href="https://github.com/karpathy/build-nanogpt" target="_blank" rel="noopener noreferrer"
                  className="block bg-slate-900/60 rounded-lg p-3 border border-slate-700/30 hover:border-sky-500/40 transition-all group cursor-pointer">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-violet-500/10 border border-violet-500/30 flex items-center justify-center text-violet-400 text-sm font-bold flex-shrink-0 group-hover:bg-violet-500/20 transition-colors">
                      &#9654;
                    </div>
                    <div className="flex-1">
                      <div className="text-slate-200 text-xs font-semibold group-hover:text-sky-300 transition-colors">karpathy/build-nanogpt</div>
                      <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                        Video + code lecture building nanoGPT from scratch, commit by commit.
                        Starts from an empty file and builds to GPT-2 reproduction. The best companion
                        if you want to understand the leap from our tiny MLP to a real transformer.
                      </p>
                      <span className="text-[9px] text-sky-500/70 mt-1 inline-block">github.com/karpathy/build-nanogpt ↗</span>
                    </div>
                  </div>
                </a>

                {/* nn-zero-to-hero YouTube */}
                <a href="https://www.youtube.com/playlist?list=PLAqhIrjkxbuWI23v9cThsA9GvCAUhRvKZ" target="_blank" rel="noopener noreferrer"
                  className="block bg-slate-900/60 rounded-lg p-3 border border-slate-700/30 hover:border-sky-500/40 transition-all group cursor-pointer">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 text-lg flex-shrink-0 group-hover:bg-red-500/20 transition-colors">
                      &#9654;
                    </div>
                    <div className="flex-1">
                      <div className="text-slate-200 text-xs font-semibold group-hover:text-sky-300 transition-colors">Neural Networks: Zero to Hero (YouTube)</div>
                      <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                        Karpathy's full lecture series. Starts with "The spelled-out intro to neural networks
                        and backpropagation: building micrograd" — the exact concepts our Manning's MicroGPT implements.
                        Progresses through makemore, GPT from scratch, and tokenization.
                      </p>
                      <span className="text-[9px] text-sky-500/70 mt-1 inline-block">youtube.com — Neural Networks: Zero to Hero playlist ↗</span>
                    </div>
                  </div>
                </a>
              </div>

              {/* Connection to our app */}
              <div className="mt-4 bg-slate-950/40 rounded-lg p-3 border border-slate-700/20">
                <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-1.5">From micrograd to Manning's MicroGPT</div>
                <div className="text-[11px] text-slate-400 leading-relaxed space-y-1.5">
                  <p>
                    <span className="text-sky-400">micrograd</span> teaches backpropagation on simple scalar expressions.
                    We applied the same ideas to a real engineering problem: can a neural network learn Manning's equation from data?
                  </p>
                  <p>
                    <span className="text-sky-400">nanoGPT</span> trains on text tokens. We train on hydraulic parameter tokens (n, D, S &#8594; Q).
                    Same algorithm — forward, loss, backward, update — different domain.
                  </p>
                  <p>
                    The progression: <span className="text-emerald-400 font-mono text-[10px]">micrograd</span> &#8594;
                    <span className="text-emerald-400 font-mono text-[10px]">Manning's MicroGPT</span> &#8594;
                    <span className="text-emerald-400 font-mono text-[10px]">nanoGPT</span> &#8594;
                    <span className="text-emerald-400 font-mono text-[10px]">GPT-4</span>.
                    Same math at every level, just more parameters and data.
                  </p>
                </div>
              </div>
            </div>

            {/* Next Steps */}
            <div className="bg-gradient-to-br from-sky-500/5 to-violet-500/5 rounded-lg p-5 border border-sky-500/20">
              <h3 className="text-sm font-bold text-sky-300 mb-2">Extensions &amp; Next Steps</h3>
              <div className="text-[11px] text-slate-400 space-y-1.5">
                <p><span className="text-violet-400 font-semibold">Partial flow:</span> Add depth/diameter ratio as input, use the more complex partial-flow Manning's with trigonometric area/perimeter calculations.</p>
                <p><span className="text-violet-400 font-semibold">RTK MicroGPT:</span> Train on R, T, K parameter triplets → predict RDII hydrograph shape, using the same architecture.</p>
                <p><span className="text-violet-400 font-semibold">Multi-output:</span> Predict both Q and V simultaneously by changing the output layer to 2 neurons.</p>
                <p><span className="text-violet-400 font-semibold">Non-circular:</span> Add shape as a categorical input (rectangular, trapezoidal, egg-shaped) and train on all geometries.</p>
                <p><span className="text-violet-400 font-semibold">Loss landscapes:</span> Visualize the 2D loss surface by freezing all weights except two and plotting loss as a 3D heatmap.</p>
              </div>
            </div>

          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-3 text-center border-t border-slate-800 mt-4">
        <span className="text-[10px] text-slate-600 tracking-wide">
          Manning's MicroGPT &middot; A SWMM5.org Vibe Coding App &middot; Neural Network learns hydraulic physics from data
        </span>
      </div>
    </div>
  );
}
