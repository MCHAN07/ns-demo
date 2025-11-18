// components/Questionnaire.js
import React, { useState } from "react";

const PHQ9 = [
  "Kurang tertarik atau tidak menikmati melakukan hal-hal",
  "Merasa sedih, tertekan, atau putus asa",
  "Kesulitan tidur atau tidur terlalu banyak",
  "Merasa lelah atau kurang energi",
  "Perubahan nafsu makan (berkurang atau bertambah)",
  "Merasa buruk tentang diri sendiri (gagal, mengecewakan diri atau keluarga)",
  "Kesulitan berkonsentrasi (membaca, menonton)",
  "Bergerak/berbicara lambat atau gelisah sehingga sulit diam",
  "Berpikir lebih baik mati atau berkeinginan menyakiti diri sendiri"
];

const GAD7 = [
  "Merasa gugup, cemas, atau tegang",
  "Tidak bisa menghentikan atau mengontrol kekhawatiran",
  "Khawatir berlebihan tentang berbagai hal",
  "Sulit untuk rileks",
  "Susah untuk tetap tenang, mudah tersinggung",
  "Sulit duduk diam atau gelisah",
  "Merasa takut seolah-olah sesuatu yang buruk akan terjadi"
];

const OPTIONS = [
  { v: 0, t: "Tidak sama sekali" },
  { v: 1, t: "Beberapa hari" },
  { v: 2, t: "Lebih dari setengah hari" },
  { v: 3, t: "Hampir setiap hari" }
];

export default function Questionnaire({ onSubmit }) {
  const [phq, setPhq] = useState(Array(PHQ9.length).fill(null));
  const [gad, setGad] = useState(Array(GAD7.length).fill(null));

  const valid = () => phq.every(x => x !== null) && gad.every(x => x !== null);

  function handleSubmit(e) {
    e.preventDefault();
    if (!valid()) return;
    const phqScore = phq.reduce((a,b)=>a+(b||0),0);
    const gadScore = gad.reduce((a,b)=>a+(b||0),0);
    onSubmit({ phqScore, gadScore, phqAnswers: phq, gadAnswers: gad });
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="q-grid">
        <div className="q-card">
          <strong>PHQ-9 (Depresi)</strong>
          {PHQ9.map((q,i) => (
            <div key={i} style={{ marginTop:8 }}>
              <div>{i+1}. {q}</div>
              <div className="radio-row">
                {OPTIONS.map(opt => (
                  <label key={opt.v} style={{display:"inline-flex",alignItems:"center",gap:6}}>
                    <input type="radio" name={`phq-${i}`} value={opt.v} onChange={()=>{
                      const cp = [...phq]; cp[i]=opt.v; setPhq(cp);
                    }} checked={phq[i]===opt.v} />
                    <span className="label-pill">{opt.t}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="q-card">
          <strong>GAD-7 (Kecemasan)</strong>
          {GAD7.map((q,i) => (
            <div key={i} style={{ marginTop:8 }}>
              <div>{i+1}. {q}</div>
              <div className="radio-row">
                {OPTIONS.map(opt => (
                  <label key={opt.v} style={{display:"inline-flex",alignItems:"center",gap:6}}>
                    <input type="radio" name={`gad-${i}`} value={opt.v} onChange={()=>{
                      const cp = [...gad]; cp[i]=opt.v; setGad(cp);
                    }} checked={gad[i]===opt.v} />
                    <span className="label-pill">{opt.t}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div style={{ display:"flex", gap:8 }}>
          <button type="submit" className="btn" disabled={!valid()}>{valid() ? "Kirim & Tampilkan Hasil" : "Lengkapi Semua Pertanyaan"}</button>
        </div>
      </div>
    </form>
  );
}
