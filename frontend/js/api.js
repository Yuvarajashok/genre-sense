(function () {
  const API_BASE = window.location.origin;
  async function parseJson(response) {
    try { return await response.json(); } catch (error) { throw new Error("Invalid server response"); }
  }
  async function request(endpoint, options) {
    const response = await fetch(`${API_BASE}${endpoint}`, options || {});
    const payload = await parseJson(response);
    if (!response.ok) { throw new Error(payload.detail || payload.message || "Request failed"); }
    return payload;
  }
  window.GenreSenseApi = {
    base: API_BASE,
    get(endpoint) { return request(endpoint, { method: "GET" }); },
    post(endpoint, body) { return request(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); },
    upload(endpoint, formData) { return request(endpoint, { method: "POST", body: formData }); },
    remove(endpoint) { return request(endpoint, { method: "DELETE" }); }
  };
})();