// pages/index.js
import React, { useCallback, useState, useRef } from "react";
import dynamic from "next/dynamic";
import Questionnaire from "../components/Questionnaire";

const CameraClassifier = dynamic(() => import("../components/CameraClassifier"), { ssr: false });

const LABELS = ["angry","contempt","disgust","fear","happy","neutral","sad","suprise"];

export default function Home() {
  const [name, setName] = useState("");
  const [nim, setNim] = useState("");
  const [predBuffer, setPredBuffer] = useState([]); // array of float[] predictions
  const bufferRef = useRef([]);
  const [showQuestionnaire, setShowQuestionnaire] = useState(false);
  const [result, setResult] = useState(null);

  // called by CameraClassifier on each frame prediction
  const onPrediction = useCallback((probs) => {
    // keep sliding window of last 120 predictions
    bufferRef.current.push(probs);
    if (bufferRef.current.length > 120) bufferRef.current.shift();
    setPredBuffer([...bufferRef.current]);
  }, []);

  function computeAverageExpression(buffer) {
    if (!buffer || buffer.length===0) return null;
    const sums = new Array(LABELS.length).fill(0);
    buffer.forEach(arr => {
      for (let i=0;i<LABELS.length;i++) sums[i]+= (arr[i]||0);
    });
    const avg = sums.map(s => s / buffer.length);
    // find top label
    let maxIdx = 0;
    for (let i=1;i<avg.length;i++) if (avg[i]>avg[maxIdx]) maxIdx=i;
    return { label: LABELS[maxIdx], score: avg[maxIdx], avgArray: avg };
  }

  function handleQuestionnaireSubmit({ phqScore, gadScore }) {
    const avgExp = computeAverageExpression(bufferRef.current);
    const phqInterpret = interpretPHQ(phqScore);
    const gadInterpret = interpretGAD(gadScore);
    setResult({ phqScore, gadScore, phqInterpret, gadInterpret, avgExp });
    setShowQuestionnaire(false);
  }

  function interpretPHQ(score) {
    if (score <= 4) return "Minimal atau tidak ada depresi";
    if (score <= 9) return "Ringan";
    if (score <= 14) return "Sedang";
    if (score <= 19) return "Sedang-berat";
    return "Berat";
  }
  function interpretGAD(score) {
    if (score <= 4) return "Minimal atau tidak ada kecemasan";
    if (score <= 9) return "Ringan";
    if (score <= 14) return "Sedang";
    return "Berat";
  }

  return (
    <div className="container">
      <div className="header">
        <div>
          <h2 style={{margin:0}}>Sistem Deteksi Ekspresi + Kuesioner</h2>
          <div className="small">Isi nama & NIM (opsional), kamera akan menyala otomatis.</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom:12 }}>
        <div>
          <label>Nama (opsional)</label>
          <input className="input" value={name} onChange={e=>setName(e.target.value)} placeholder="Nama"/>
        </div>
        <div style={{ marginTop:8 }}>
          <label>NIM (opsional)</label>
          <input className="input" value={nim} onChange={e=>setNim(e.target.value)} placeholder="NIM"/>
        </div>
      </div>

      <CameraClassifier onPrediction={onPrediction} />

      <div style={{ marginTop:10, display:"flex", gap:8 }}>
        <button className="btn" onClick={()=>setShowQuestionnaire(true)}>Mulai Kuesioner PHQ-9 & GAD-7</button>
      </div>

      {showQuestionnaire && (
        <div style={{ marginTop:12 }} className="card">
          <strong>Isilah kuesioner berikut:</strong>
          <Questionnaire onSubmit={handleQuestionnaireSubmit} />
          <div style={{ marginTop:8 }}>
            <button className="btn" onClick={()=>setShowQuestionnaire(false)}>Batal</button>
          </div>
        </div>
      )}

      {result && (
        <div className="card result">
          <h3>Hasil</h3>
          <div>PHQ-9: <strong>{result.phqScore}</strong> — {result.phqInterpret}</div>
          <div>GAD-7: <strong>{result.gadScore}</strong> — {result.gadInterpret}</div>
          <div style={{ marginTop:8 }}>
            <strong>Rata-rata ekspresi wajah:</strong>
            {result.avgExp ? (
              <div>
                <div style={{ marginTop:6 }}>{result.avgExp.label} — {(result.avgExp.score*100).toFixed(1)}%</div>
                <div className="small">Distribusi: {LABELS.map((l,i)=> `${l}: ${(result.avgExp.avgArray[i]*100).toFixed(1)}%`).join(" | ")}</div>
              </div>
            ) : <div className="small">Belum ada data ekspresi wajah.</div>}
          </div>
        </div>
      )}

      <div style={{ marginTop:12 }} className="small">Disclaimer: hasil kuisioner & pengenalan ekspresi bersifat informatif, bukan diagnosis. Untuk perhatian medis, konsultasikan profesional kesehatan.</div>
    </div>
  );
}
