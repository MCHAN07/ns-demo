// components/CameraClassifier.js
import React, { useEffect, useRef, useState } from "react";
import * as tf from "@tensorflow/tfjs";
import * as blazeface from "@tensorflow-models/blazeface";

const LABELS = ["angry","contempt","disgust","fear","happy","neutral","sad","suprise"];

export default function CameraClassifier({ onPrediction }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const modelRef = useRef(null);
  const faceModelRef = useRef(null);
  const rafRef = useRef(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function setup() {
      try {
        // Pastikan tf siap
        await tf.ready();

        // Load BlazeFace (face detector)
        faceModelRef.current = await blazeface.load();
        console.log("[CameraClassifier] BlazeFace loaded");

        // Cek TFLite runtime dari global (dimuat lewat pages/_document.js)
        const globalTflite =
          (typeof window !== "undefined" && window.tf && window.tf.tflite)
            ? window.tf.tflite
            : (typeof window !== "undefined" ? window.tflite : null);

        if (!globalTflite) {
          console.warn("[CameraClassifier] TFLite runtime tidak ditemukan. Pastikan script CDN tfjs-tflite dimuat di pages/_document.js. Anda masih bisa menggunakan konversi TFLite->TFJS (fallback).");
        } else {
          // Coba load model TFLite dari /public/ferplus_cnn.tflite
          try {
            modelRef.current = await globalTflite.loadTFLiteModel("/ferplus_cnn.tflite");
            console.log("[CameraClassifier] TFLite model loaded");
          } catch (e) {
            console.error("[CameraClassifier] Gagal memuat ferplus_cnn.tflite:", e);
          }
        }

        // Start kamera (facing user)
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
        if (!mounted) { stream.getTracks().forEach(t => t.stop()); return; }
        videoRef.current.srcObject = stream;

        // Tunggu video onloadeddata (agar videoWidth/videoHeight tersedia)
        await new Promise(resolve => {
          if (videoRef.current.readyState >= 2) return resolve();
          const onLoaded = () => {
            videoRef.current.removeEventListener("loadeddata", onLoaded);
            resolve();
          };
          videoRef.current.addEventListener("loadeddata", onLoaded);
        });

        try { await videoRef.current.play(); } catch (e) { console.warn("video.play() error:", e); }

        console.log("[CameraClassifier] Kamera aktif:", videoRef.current.videoWidth, videoRef.current.videoHeight);
        setLoading(false);

        // Mulai loop inference
        loop();
      } catch (err) {
        console.error("[CameraClassifier] setup error:", err);
        setLoading(false);
      }
    }

    setup();

    return () => {
      mounted = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      const s = videoRef.current?.srcObject;
      if (s) s.getTracks().forEach(t => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loop() {
    if (!videoRef.current || videoRef.current.readyState < 2) {
      rafRef.current = requestAnimationFrame(loop);
      return;
    }

    try {
      // Jika wajah tidak terdeteksi, kita tetap bisa melakukan fallback menggunakan full frame crop
      // Gunakan flipHorizontal = false jika Anda tidak memirror video di CSS.
      // Jika Anda memirror video di CSS (transform: scaleX(-1)), set flipHorizontal = true.
      const flipHorizontal = false; // <-- ubah ke true jika video dimirror di CSS
      const faces = await faceModelRef.current.estimateFaces(videoRef.current, false, flipHorizontal);

      let cropCanvas = null;
      if (faces && faces.length > 0) {
        // Ambil face pertama
        const f = faces[0];
        // BlazeFace vX memberikan topLeft & bottomRight
        const [x1, y1] = f.topLeft;
        const [x2, y2] = f.bottomRight;
        const w = Math.max(2, x2 - x1);
        const h = Math.max(2, y2 - y1);

        // buat offscreen canvas untuk crop
        const canvas = canvasRef.current || document.createElement("canvas");
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext("2d");

        // drawImage coordinates: (sourceX, sourceY, sourceW, sourceH, destX, destY, destW, destH)
        // Jika flipHorizontal = true, BlazeFace sudah memperhitungkan flip; sehingga kita pakai coords langsung.
        ctx.drawImage(videoRef.current, x1, y1, w, h, 0, 0, canvas.width, canvas.height);
        cropCanvas = canvas;
      } else {
        // fallback: ambil bagian tengah frame, atau full frame scaled
        const canvas = canvasRef.current || document.createElement("canvas");
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        cropCanvas = canvas;
      }

      // jika model tflite ada, lakukan inferensi
      if (cropCanvas && modelRef.current) {
        // Preprocess: contoh ini mengasumsikan model menerima [1,64,64,1] grayscale normalized 0..1
        const t = tf.browser.fromPixels(cropCanvas).resizeNearestNeighbor([64,64]).mean(2).toFloat().expandDims(0).expandDims(-1).div(255.0);

        // modelRef.current.predict mungkin mengembalikan tf.Tensor atau TypedArray tergantung runtime
        const out = modelRef.current.predict(t);
        let probs = null;

        if (out && typeof out.data === "function") {
          // tf.Tensor-like
          probs = Array.from(await out.data());
          // dispose jika punya dispose
          if (typeof out.dispose === "function") out.dispose();
        } else if (out && out.length) {
          // TypedArray / Array
          probs = Array.from(out);
        } else if (out && out.dataSync) {
          probs = Array.from(out.dataSync());
        }

        if (probs && onPrediction) {
          onPrediction(probs);
        }

        tf.dispose(t);
      }
    } catch (e) {
      // Log minimal supaya tidak banjir console
      // console.warn("[CameraClassifier] loop error:", e);
    }

    rafRef.current = requestAnimationFrame(loop);
  }

  return (
    <div className="card">
      <div className="video-wrap" style={{ minHeight: 300 }}>
        {/* Catatan: Jika Anda ingin mirror UX, ubah flipHorizontal=true di kode dan tambahkan CSS transform pada video.
            Untuk debugging, sebaiknya jangan mirror agar koordinat lebih mudah. */}
        <video ref={videoRef} playsInline muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        <canvas ref={canvasRef} style={{ display: "none" }} />
      </div>
      <div className="footer-note small">{loading ? "Memuat model dan kamera..." : "Kamera aktif — model (jika runtime tersedia) dimuat."}</div>
    </div>
  );
}
