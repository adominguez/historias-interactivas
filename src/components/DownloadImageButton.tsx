import React from "react";
import cv from "@techstark/opencv-js";

interface DownloadImageButtonProps {
  imageUrl: string; // URL de la imagen a procesar
  slug: string; // Slug de la historia
}

class DownloadImageButton extends React.Component<DownloadImageButtonProps> {
  private processAndDownloadImage = async () => {
    const { imageUrl, slug } = this.props;

    // Crear un canvas temporal
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      console.error("No se pudo obtener el contexto del canvas.");
      return;
    }

    // Establecer dimensiones de un folio A4 apaisado en píxeles
    const A4_WIDTH = 1123; // Ancho
    const A4_HEIGHT = 794; // Alto
    canvas.width = A4_WIDTH;
    canvas.height = A4_HEIGHT;

    // Cargar la imagen desde la URL
    const imgElement = new Image();
    imgElement.crossOrigin = "Anonymous"; // Permite el acceso a imágenes de otros dominios
    imgElement.src = imageUrl;

    imgElement.onload = async () => {
      // Leer la imagen original con OpenCV
      const img = cv.imread(imgElement);

      // Calcular escala para ajustar la imagen al ancho del folio sin deformarla
      const imgAspectRatio = img.cols / img.rows;
      const targetWidth = A4_WIDTH; // Ancho completo del canvas
      const targetHeight = A4_WIDTH / imgAspectRatio; // Altura ajustada al ancho

      // Redimensionar la imagen original
      const resizedImg = new cv.Mat();
      cv.resize(img, resizedImg, new cv.Size(targetWidth, targetHeight));

      // Convertir a escala de grises
      const imgGray = new cv.Mat();
      cv.cvtColor(resizedImg, imgGray, cv.COLOR_BGR2GRAY);

      // Detectar bordes usando Canny
      const edges = new cv.Mat();
      cv.Canny(imgGray, edges, 120, 120);
      cv.bitwise_not(edges, edges);

      // Dibujar la imagen en la parte superior del canvas
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, A4_WIDTH, A4_HEIGHT); // Fondo blanco
      const edgeCanvas = document.createElement("canvas");
      edgeCanvas.width = targetWidth;
      edgeCanvas.height = targetHeight;
      cv.imshow(edgeCanvas, edges);
      ctx.drawImage(edgeCanvas, 0, 0, targetWidth, targetHeight); // Posicionada en la parte superior

      // Añadir textos (marca de agua)
      ctx.font = "40px 'Ysabeau SC', Arial"; // Fuente personalizada
      ctx.fillStyle = "black";
      ctx.textAlign = "center";

      // Ajustar posiciones y espaciado entre textos
      const textSpacing = 40; // Espaciado entre líneas
      const textOffset = 70; // Distancia inicial desde el borde inferior de la imagen

      // Texto principal
      const mainText = "El Árbol de las Historias";
      ctx.fillText(mainText, A4_WIDTH / 2, targetHeight + textOffset);

      // Texto secundario (URL)
      ctx.font = "30px 'Ysabeau Infant Variable', Arial"; // Fuente más pequeña
      const subText = "https://elarboldelashistorias.com";
      ctx.fillText(subText, A4_WIDTH / 2, targetHeight + textOffset + textSpacing);

      // Descargar la imagen procesada
      const link = document.createElement("a");
      link.download = `${slug}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();

      // Liberar memoria
      img.delete();
      resizedImg.delete();
      imgGray.delete();
      edges.delete();
    };

    imgElement.onerror = () => {
      console.error("No se pudo cargar la imagen desde la URL proporcionada.");
    };
  };

  render() {
    return (
      <button
        style={{
          padding: "10px 20px",
          fontSize: "16px",
          cursor: "pointer",
        }}
        onClick={this.processAndDownloadImage}
      >
        Generar y Descargar Imagen
      </button>
    );
  }
}

export default DownloadImageButton;
