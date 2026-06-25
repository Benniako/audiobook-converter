const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

class ApiClient {
  private token: string | null = null;

  constructor() {
    if (typeof window !== "undefined") {
      this.token = localStorage.getItem("token");
    }
  }

  setToken(token: string | null) {
    this.token = token;
    if (typeof window !== "undefined") {
      if (token) localStorage.setItem("token", token);
      else localStorage.removeItem("token");
    }
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };
    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }

    // Don't set Content-Type for FormData
    if (options.body instanceof FormData) {
      delete headers["Content-Type"];
    }

    const res = await fetch(`${API_URL}${path}`, { ...options, headers });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || `HTTP ${res.status}`);
    }

    if (res.status === 204) return undefined as T;
    return res.json();
  }

  // Auth
  register(email: string, password: string) {
    return this.request<{ id: string; email: string; plan: string; created_at: string }>(
      "/api/auth/register",
      { method: "POST", body: JSON.stringify({ email, password }) }
    );
  }

  async login(email: string, password: string) {
    const data = await this.request<{ access_token: string }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    this.setToken(data.access_token);
    return data;
  }

  getMe() {
    return this.request<{ id: string; email: string; plan: string }>("/api/auth/me");
  }

  // Books
  async uploadBook(file: File) {
    const form = new FormData();
    form.append("file", file);
    return this.request<{ id: string; title: string; status: string }>("/api/books/upload", {
      method: "POST",
      body: form,
    });
  }

  listBooks() {
    return this.request<Array<{
      id: string; title: string; author: string; cover_url: string | null;
      status: string; tts_provider: string; duration_seconds: number; created_at: string;
    }>>("/api/books/");
  }

  getBook(id: string) {
    return this.request<{
      id: string; title: string; author: string; cover_url: string | null;
      status: string; tts_provider: string; duration_seconds: number;
      chapters: Array<{ id: string; index: number; title: string; audio_path: string | null; duration_seconds: number }>;
    }>(`/api/books/${id}`);
  }

  deleteBook(id: string) {
    return this.request<void>(`/api/books/${id}`, { method: "DELETE" });
  }

  // Conversion
  startConversion(bookId: string, ttsProvider: string = "kokoro", language?: string, targetLanguage?: string) {
    let url = `/api/books/${bookId}/convert?tts_provider=${ttsProvider}`;
    if (language) url += `&language=${language}`;
    if (targetLanguage) url += `&target_language=${targetLanguage}`;
    return this.request<{ message: string; book_id: string }>(url, { method: "POST" });
  }

  getLanguages() {
    return this.request<Array<{ code: string; name: string; native: string; flag: string; tts: string[] }>>("/api/languages/");
  }

  getConversionStatus(bookId: string) {
    return this.request<{ status: string; progress: number; error_message: string | null; queue_position?: number }>(
      `/api/books/${bookId}/status`
    );
  }

  detectLanguage(text: string) {
    return this.request<{ language: string }>("/api/languages/detect", {
      method: "POST", body: JSON.stringify({ text: text.slice(0, 1000) }),
    });
  }

  // TTS Providers
  getTTSProviders() {
    return this.request<Array<{ id: string; name: string; voices: Array<{ id: string; name: string }> }>>(
      "/api/tts/providers"
    );
  }

  // Admin
  getCustomTTSProviders() {
    return this.request<Array<{
      id: string; name: string; provider_type: string; config: string; is_active: boolean;
    }>>("/api/admin/custom-tts");
  }

  createCustomTTS(data: { name: string; provider_type: string; config: string }) {
    return this.request("/api/admin/custom-tts", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  updateCustomTTS(id: string, data: { name?: string; config?: string; is_active?: boolean }) {
    return this.request(`/api/admin/custom-tts/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  deleteCustomTTS(id: string) {
    return this.request<void>(`/api/admin/custom-tts/${id}`, { method: "DELETE" });
  }

  testCustomTTS(id: string) {
    return this.request<{ success: boolean; audio_size_bytes?: number; error?: string }>(
      `/api/admin/custom-tts/${id}/test`, { method: "POST" }
    );
  }

  getAdminStats() {
    return this.request<{ total_users: number; total_books: number; pending_jobs: number }>(
      "/api/admin/stats"
    );
  }

  // Audio URLs (not via fetch API)
  getChapterAudioUrl(bookId: string, chapterId: string) {
    return `${API_URL}/api/books/${bookId}/chapters/${chapterId}/audio`;
  }

  getDownloadUrl(bookId: string) {
    return `${API_URL}/api/books/${bookId}/download`;
  }
}

export const api = new ApiClient();
