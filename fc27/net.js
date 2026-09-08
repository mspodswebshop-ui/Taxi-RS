/* Arena FC 27 — online spelen zonder server. Twee browsers verbinden rechtstreeks
   met elkaar (WebRTC). De uitnodiging en het antwoord zijn stukjes tekst die je
   zelf doorstuurt, dus er hoeft niets gehost te worden.
   De host rekent de wedstrijd door en stuurt de stand van het veld; de gast
   stuurt alleen zijn invoer terug. */
const Net = (function () {
  "use strict";

  const ICE = { iceServers: [{ urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] }] };

  let pc = null, ch = null, role = null, status = "leeg";
  let onMsg = null, onState = null;

  function setStatus(s) { status = s; if (onState) onState(s); }

  const encode = (obj) => btoa(unescape(encodeURIComponent(JSON.stringify(obj))));
  function decode(txt) {
    return JSON.parse(decodeURIComponent(escape(atob(txt.replace(/\s+/g, "")))));
  }

  /* Wachten tot alle netwerkadressen verzameld zijn, anders is de code onbruikbaar. */
  function gathered(conn) {
    return new Promise((res) => {
      if (conn.iceGatheringState === "complete") return res();
      const done = () => {
        if (conn.iceGatheringState === "complete") {
          conn.removeEventListener("icegatheringstatechange", done);
          res();
        }
      };
      conn.addEventListener("icegatheringstatechange", done);
      setTimeout(res, 2500);      // niet eindeloos wachten op trage netwerken
    });
  }

  function wire(channel) {
    ch = channel;
    ch.onopen = () => setStatus("verbonden");
    ch.onclose = () => setStatus("verbroken");
    ch.onmessage = (e) => {
      if (!onMsg) return;
      try { onMsg(JSON.parse(e.data)); } catch (err) { /* rommel negeren */ }
    };
  }

  async function host() {
    close();
    role = "host";
    setStatus("code maken");
    pc = new RTCPeerConnection(ICE);
    wire(pc.createDataChannel("spel", { ordered: true }));
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "failed") setStatus("mislukt");
    };
    await pc.setLocalDescription(await pc.createOffer());
    await gathered(pc);
    setStatus("wacht op tegenstander");
    return encode({ t: "uitnodiging", sdp: pc.localDescription });
  }

  async function join(codeText) {
    close();
    role = "gast";
    setStatus("verbinden");
    const data = decode(codeText);
    if (!data || data.t !== "uitnodiging") throw new Error("Dit is geen geldige uitnodiging.");
    pc = new RTCPeerConnection(ICE);
    pc.ondatachannel = (e) => wire(e.channel);
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "failed") setStatus("mislukt");
    };
    await pc.setRemoteDescription(data.sdp);
    await pc.setLocalDescription(await pc.createAnswer());
    await gathered(pc);
    setStatus("wacht op host");
    return encode({ t: "antwoord", sdp: pc.localDescription });
  }

  async function accept(codeText) {
    const data = decode(codeText);
    if (!data || data.t !== "antwoord") throw new Error("Dit is geen geldig antwoord.");
    await pc.setRemoteDescription(data.sdp);
    setStatus("verbinden");
  }

  function send(obj) {
    if (ch && ch.readyState === "open") {
      try { ch.send(JSON.stringify(obj)); } catch (e) { /* volle buffer */ }
    }
  }

  function close() {
    if (ch) { try { ch.close(); } catch (e) {} ch = null; }
    if (pc) { try { pc.close(); } catch (e) {} pc = null; }
    role = null;
    setStatus("leeg");
  }

  return {
    host: host, join: join, accept: accept, send: send, close: close,
    onMessage: (fn) => { onMsg = fn; },
    onStatus: (fn) => { onState = fn; },
    role: () => role,
    status: () => status,
    open: () => !!ch && ch.readyState === "open"
  };
})();
