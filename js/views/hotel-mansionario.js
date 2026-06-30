// js/views/hotel-mansionario.js
// Wrapper: carica il mansionario con contesto hotel
// Riusa tutta la logica di bo-sala-mansionario.js

export async function render(container) {
  // Imposta il contesto hotel nell'hash per permettere a getContesto() di leggerlo
  if (!window.location.hash.includes("contesto=")) {
    const currentHash = window.location.hash.split("?")[0];
    window.history.replaceState(null, "", currentHash + "?contesto=hotel");
  }

  // Carica dinamicamente il modulo mansionario principale
  const { render: renderMansionario } = await import("./bo-sala-mansionario.js?v=1");
  await renderMansionario(container);
}
