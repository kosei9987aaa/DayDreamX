var wisp_client;
(() => {
  "use strict";
  var e = {
      d: (t, s) => {
        for (var i in s)
          e.o(s, i) &&
            !e.o(t, i) &&
            Object.defineProperty(t, i, { enumerable: !0, get: s[i] });
      },
      o: (e, t) => Object.prototype.hasOwnProperty.call(e, t),
      r: (e) => {
        "undefined" != typeof Symbol &&
          Symbol.toStringTag &&
          Object.defineProperty(e, Symbol.toStringTag, { value: "Module" }),
          Object.defineProperty(e, "__esModule", { value: !0 });
      },
    },
    t = {};
  e.r(t), e.d(t, { client: () => i, packet: () => s });
  var s = {};
  e.r(s),
    e.d(s, {
      ClosePayload: () => y,
      ConnectPayload: () => p,
      ContinuePayload: () => d,
      DataPayload: () => _,
      WispBuffer: () => h,
      WispPacket: () => l,
      close_reasons: () => u,
      packet_classes: () => f,
      packet_types: () => w,
      stream_types: () => m,
    });
  var i = {};
  e.r(i),
    e.d(i, {
      ClientConnection: () => v,
      WispWebSocket: () => C,
      _wisp_connections: () => E,
    });
  const n = globalThis.WebSocket,
    r = (globalThis.crypto, new TextEncoder()),
    o = r.encode.bind(r),
    a = new TextDecoder(),
    c = a.decode.bind(a);
  class h {
    constructor(e) {
      if (e instanceof Uint8Array) this.from_array(e);
      else if ("number" == typeof e) this.from_array(new Uint8Array(e));
      else {
        if ("string" != typeof e)
          throw (
            (console.trace(),
            "invalid data type passed to wisp buffer constructor")
          );
        this.from_array(o(e));
      }
    }
    from_array(e) {
      (this.size = e.length),
        (this.bytes = e),
        (this.view = new DataView(e.buffer));
    }
    concat(e) {
      let t = new h(this.size + e.size);
      return t.bytes.set(this.bytes, 0), t.bytes.set(e.bytes, this.size), t;
    }
    slice(e, t) {
      let s = this.bytes.slice(e, t);
      return new h(s);
    }
  }
  class l {
    static min_size = 5;
    constructor({ type: e, stream_id: t, payload: s, payload_bytes: i }) {
      (this.type = e),
        (this.stream_id = t),
        (this.payload_bytes = i),
        (this.payload = s);
    }
    static parse(e) {
      return new l({
        type: e.view.getUint8(0),
        stream_id: e.view.getUint32(1, !0),
        payload_bytes: e.slice(5),
      });
    }
    static parse_all(e) {
      if (e.size < l.min_size) throw "packet too small";
      let t = l.parse(e),
        s = f[t.type];
      if (void 0 === s) throw "invalid packet type";
      if (t.payload_bytes.size < s.size) throw "payload too small";
      return (t.payload = s.parse(t.payload_bytes)), t;
    }
    serialize() {
      let e = new h(5);
      return (
        e.view.setUint8(0, this.type),
        e.view.setUint32(1, this.stream_id, !0),
        (e = e.concat(this.payload.serialize())),
        e
      );
    }
  }
  class p {
    static min_size = 3;
    static type = 1;
    static name = "CONNECT";
    constructor({ stream_type: e, port: t, hostname: s }) {
      (this.stream_type = e), (this.port = t), (this.hostname = s);
    }
    static parse(e) {
      return new p({
        stream_type: e.view.getUint8(0),
        port: e.view.getUint16(1, !0),
        hostname: c(e.slice(3).bytes),
      });
    }
    serialize() {
      let e = new h(3);
      return (
        e.view.setUint8(0, this.stream_type),
        e.view.setUint16(1, this.port, !0),
        (e = e.concat(new h(this.hostname))),
        e
      );
    }
  }
  class _ {
    static min_size = 0;
    static type = 2;
    static name = "DATA";
    constructor({ data: e }) {
      this.data = e;
    }
    static parse(e) {
      return new _({ data: e });
    }
    serialize() {
      return this.data;
    }
  }
  class d {
    static type = 3;
    static name = "CONTINUE";
    constructor({ buffer_remaining: e }) {
      this.buffer_remaining = e;
    }
    static parse(e) {
      return new d({ buffer_remaining: e.view.getUint32(0, !0) });
    }
    serialize() {
      let e = new h(4);
      return e.view.setUint32(0, this.buffer_remaining, !0), e;
    }
  }
  class y {
    static min_size = 1;
    static type = 4;
    static name = "CLOSE";
    constructor({ reason: e }) {
      this.reason = e;
    }
    static parse(e) {
      return new y({ reason: e.view.getUint8(0) });
    }
    serialize() {
      let e = new h(1);
      return e.view.setUint8(0, this.buffer_remaining), e;
    }
  }
  const f = [void 0, p, _, d, y],
    w = { CONNECT: 1, DATA: 2, CONTINUE: 3, CLOSE: 4 },
    m = { TCP: 1, UDP: 2 },
    u = {
      Unknown: 1,
      Voluntary: 2,
      NetworkError: 3,
      InvalidInfo: 65,
      UnreachableHost: 66,
      NoResponse: 67,
      ConnRefused: 68,
      TransferTimeout: 71,
      HostBlocked: 72,
      ConnThrottled: 73,
      ClientError: 129,
    };
  class b {
    constructor(e, t, s, i, n, r, o) {
      (this.hostname = e),
        (this.port = t),
        (this.ws = s),
        (this.buffer_size = i),
        (this.stream_id = n),
        (this.connection = r),
        (this.stream_type = o),
        (this.send_buffer = []),
        (this.open = !0),
        (this.onopen = () => {}),
        (this.onclose = () => {}),
        (this.onmessage = () => {});
    }
    send(e) {
      if (this.buffer_size > 0 || !this.open || this.stream_type === m.UDP) {
        let t = new l({
          type: w.DATA,
          stream_id: this.stream_id,
          payload: new _({ data: new h(e) }),
        });
        this.ws.send(t.serialize().bytes), this.buffer_size--;
      } else this.send_buffer.push(e);
    }
    continue_received(e) {
      for (
        this.buffer_size = e;
        this.buffer_size > 0 && this.send_buffer.length > 0;

      )
        this.send(this.send_buffer.shift());
    }
    close(e = 1) {
      if (!this.open) return;
      let t = new l({
        type: w.CLOSE,
        stream_id,
        payload: new y({ reason: e }),
      });
      this.ws.send(t.serialize().bytes),
        (this.open = !1),
        delete this.connection.active_streams[this.stream_id];
    }
  }
  class v {
    constructor(e) {
      if (!e.endsWith("/"))
        throw "wisp endpoints must end with a trailing forward slash";
      (this.wisp_url = e),
        (this.max_buffer_size = null),
        (this.active_streams = {}),
        (this.connected = !1),
        (this.connecting = !1),
        (this.next_stream_id = 1),
        (this.onopen = () => {}),
        (this.onclose = () => {}),
        (this.onerror = () => {}),
        (this.onmessage = () => {}),
        this.connect_ws();
    }
    connect_ws() {
      (this.ws = new n(this.wisp_url)),
        (this.ws.binaryType = "arraybuffer"),
        (this.connecting = !0),
        (this.ws.onerror = () => {
          this.on_ws_close(), this.onerror();
        }),
        (this.ws.onclose = () => {
          this.on_ws_close(), this.onclose();
        }),
        (this.ws.onmessage = (e) => {
          this.on_ws_msg(e),
            this.connecting &&
              ((this.connected = !0), (this.connecting = !1), this.onopen());
        });
    }
    close_stream(e, t) {
      e.onclose(t), delete this.active_streams[e.stream_id];
    }
    on_ws_close() {
      (this.connected = !1), (this.connecting = !1);
      for (let e of Object.keys(this.active_streams))
        this.close_stream(this.active_streams[e], 3);
    }
    create_stream(e, t, s = "tcp") {
      let i = "udp" === s ? 2 : 1,
        n = this.next_stream_id++,
        r = new b(e, t, this.ws, this.max_buffer_size, n, this, i);
      (this.active_streams[n] = r), (r.open = this.connected);
      let o = new l({
        type: w.CONNECT,
        stream_id: n,
        payload: new p({ stream_type: i, port: t, hostname: e }),
      });
      return this.ws.send(o.serialize().bytes), r;
    }
    on_ws_msg(e) {
      let t = new h(new Uint8Array(e.data));
      if (t.size < l.min_size)
        return void console.warn(
          "wisp client warning: received a packet which is too short",
        );
      let s = l.parse_all(t),
        i = this.active_streams[s.stream_id];
      void 0 !== i || (0 === s.stream_id && s.type === w.CONTINUE)
        ? s.type === w.DATA
          ? i.onmessage(s.payload_bytes.bytes)
          : s.type === w.CONTINUE && 0 == s.stream_id
            ? (this.max_buffer_size = s.payload.buffer_remaining)
            : s.type === w.CONTINUE
              ? i.continue_received(s.payload.buffer_size)
              : s.type === w.CLOSE
                ? this.close_stream(i, s.payload.reason)
                : console.warn(
                    `wisp client warning: receive an invalid packet of type ${s.type}`,
                  )
        : console.warn(
            `wisp client warning: received a ${f[s.type].name} packet for a stream which doesn't exist`,
          );
    }
  }
  const g = globalThis.CloseEvent || Event,
    E = {};
  class C extends EventTarget {
    constructor(e, t) {
      super(),
        (this.url = e),
        (this.protocols = t),
        (this.binaryType = "blob"),
        (this.stream = null),
        (this.connection = null),
        (this.onopen = () => {}),
        (this.onerror = () => {}),
        (this.onmessage = () => {}),
        (this.onclose = () => {}),
        (this.CONNECTING = 0),
        (this.OPEN = 1),
        (this.CLOSING = 2),
        (this.CLOSED = 3),
        (this._ready_state = this.CONNECTING);
      let s = this.url.split("/"),
        i = s.pop().split(":");
      (this.host = i[0]),
        (this.port = parseInt(i[1])),
        (this.real_url = s.join("/") + "/"),
        this.init_connection();
    }
    on_conn_close() {
      (this._ready_state = this.CLOSED),
        E[this.real_url] &&
          (this.onerror(new Event("error")),
          this.dispatchEvent(new Event("error"))),
        delete E[this.real_url];
    }
    init_connection() {
      if (((this.connection = E[this.real_url]), this.connection))
        if (this.connection.connected)
          (this.connection = E[this.real_url]), this.init_stream();
        else {
          let e = this.connection.onopen;
          this.connection.onopen = () => {
            e(), this.init_stream();
          };
        }
      else
        (this.connection = new v(this.real_url)),
          (this.connection.onopen = () => {
            this.init_stream();
          }),
          (this.connection.onclose = () => {
            this.on_conn_close();
          }),
          (this.connection.onerror = () => {
            this.on_conn_close();
          }),
          (E[this.real_url] = this.connection);
    }
    init_stream() {
      (this._ready_state = this.OPEN),
        (this.stream = this.connection.create_stream(this.host, this.port)),
        (this.stream.onmessage = (e) => {
          let t;
          if ("blob" == this.binaryType) t = new Blob(e);
          else {
            if ("arraybuffer" != this.binaryType)
              throw "invalid binaryType string";
            t = e.buffer;
          }
          let s = new MessageEvent("message", { data: t });
          this.onmessage(s), this.dispatchEvent(s);
        }),
        (this.stream.onclose = (e) => {
          this._ready_state = this.CLOSED;
          let t = new g("close", { code: e });
          this.onclose(t), this.dispatchEvent(t);
        });
      let e = new Event("open");
      this.onopen(e), this.dispatchEvent(e);
    }
    send(e) {
      let t;
      if (e instanceof Uint8Array) t = e;
      else if ("string" == typeof e) t = new TextEncoder().encode(e);
      else {
        if (e instanceof Blob)
          return void e.arrayBuffer().then((e) => {
            this.send(e);
          });
        if (e instanceof ArrayBuffer) t = new Uint8Array(e);
        else {
          if (!ArrayBuffer.isView(e)) throw "invalid data type to be sent";
          t = new Uint8Array(e.buffer);
        }
      }
      if (!this.stream) throw "websocket is not ready";
      this.stream.send(t);
    }
    close() {
      this.stream.close(2);
    }
    get bufferedAmount() {
      let e = 0;
      for (let t of this.stream.send_buffer) e += t.length;
      return e;
    }
    get extensions() {
      return "";
    }
    get protocol() {
      return "binary";
    }
    get readyState() {
      return this._ready_state;
    }
  }
  wisp_client = t;
})();
