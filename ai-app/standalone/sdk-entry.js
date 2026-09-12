// Ingang voor het bundelen van de Anthropic-SDK in het losse HTML-bestand.
// build-standalone.mjs bakt het resultaat hiervan mee, zodat de pagina geen
// externe CDN nodig heeft en dus ook werkt als die geblokkeerd is.
export { default as Anthropic } from "@anthropic-ai/sdk";
