// pages/_document.js
import Document, { Html, Head, Main, NextScript } from "next/document";

class MyDocument extends Document {
  render() {
    return (
      <Html>
        <Head>
          {/* TensorFlow.js via CDN */}
          <script src="https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.11.0/dist/tf.min.js"></script>

          {/* TFJS-TFLite runtime (WASM) via CDN — ini membuat window.tf.tflite / window.tflite tersedia */}
          {/* Jika URL ini tidak berhasil (tergantung CDN), aplikasi akan memberi peringatan dan Anda bisa memilih fallback. */}
          <script src="https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-tflite@0.0.3/dist/tfjs-tflite.js"></script>

          {/* Catatan: jika CDN gagal, gunakan opsi konversi tflite -> tfjs (lihat bagian fallback di bawah). */}
        </Head>
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}

export default MyDocument;
