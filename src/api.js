const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:8000").replace(/\/$/, "");

// デモモード。true の間はログイン画面を出さず、全機能を管理者として利用できます。
// クライアントが本番でアカウント管理を有効化する時は、環境変数 VITE_DEMO_MODE=false にします。
// 真偽値の解釈は backend/config.py の _as_bool と必ず揃えること（片側だけ切り替わる事故を防ぐため）。
const TRUTHY = ["1", "true", "yes", "on"];
export const DEMO_MODE = TRUTHY.includes(String(import.meta.env.VITE_DEMO_MODE ?? "true").trim().toLowerCase());


export class ApiError extends Error {
  constructor(message, status = 0) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}


export async function apiRequest(path, { method = "GET", body, token } = {}) {
  const headers = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError("APIに接続できません。バックエンドが起動中、または停止している可能性があります。");
  }

  const contentType = response.headers.get("content-type") || "";
  let data = null;
  if (contentType.includes("application/json")) {
    try {
      data = await response.json();
    } catch {
      throw new ApiError("APIから正しい形式の応答を受け取れませんでした。", response.status);
    }
  } else if (response.status !== 204) {
    throw new ApiError("APIが起動中、または一時的に利用できません。少し待って再試行してください。", response.status);
  }

  if (!response.ok) {
    const detail = typeof data?.detail === "string" ? data.detail : "処理に失敗しました。";
    throw new ApiError(detail, response.status);
  }

  return data;
}


export function getToken() {
  return sessionStorage.getItem("roadmap_access_token");
}


export function saveToken(token) {
  sessionStorage.setItem("roadmap_access_token", token);
}


export function clearToken() {
  sessionStorage.removeItem("roadmap_access_token");
}
