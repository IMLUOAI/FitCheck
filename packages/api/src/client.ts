import type {
  AddFavoriteInput,
  AddGalleryLinkInput,
  AddItemInput,
  Battle,
  BattlePick,
  ClothingItem,
  CreateBattleInput,
  CreateFitInput,
  DataEnvelope,
  Favorite,
  Fit,
  GalleryItem,
  GalleryUploadFile,
  GetBattlesParams,
  GetFitsParams,
  PublicUser,
  SignInInput,
  SignUpInput,
  UpdateProfileInput,
  User,
} from "./types";

/** Thrown for non-2xx API responses. */
export class ApiError extends Error {
  readonly status: number;
  readonly body: string;

  constructor(status: number, body: string) {
    super(body || `Request failed with status ${status}`);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

export interface ApiClientConfig {
  /** Base URL, no trailing slash. */
  baseUrl: string;
  /** Called on every authenticated request; return the stored JWT or null. */
  getToken?: () => string | null | Promise<string | null>;
}

type HttpMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

/** Build a query string from defined params only. */
function toQuery(params: object): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) search.set(key, String(value));
  }
  const str = search.toString();
  return str ? `?${str}` : "";
}

/**
 * Typed fetch client for the DripCast backend. No axios — the global fetch
 * (available in React Native / Expo and modern runtimes) is all it needs.
 */
export class DripApi {
  private readonly baseUrl: string;
  private readonly getToken?: () => string | null | Promise<string | null>;

  constructor(config: ApiClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/+$/, "");
    this.getToken = config.getToken;
  }

  private async request<T>(path: string, method: HttpMethod, body?: unknown, extraHeaders?: Record<string, string>): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...extraHeaders,
    };
    if (this.getToken) {
      const token = await this.getToken();
      if (token) headers.Authorization = `Bearer ${token}`;
    }
    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await response.text();
    if (!response.ok) {
      throw new ApiError(response.status, text);
    }
    return (text ? JSON.parse(text) : undefined) as T;
  }

  /** POST /signin -> { token } */
  async signIn(input: SignInInput): Promise<{ token: string }> {
    return this.request<{ token: string }>("/signin", "POST", input);
  }

  /** POST /signup -> 201 { data: user } (name + avatar are required by the backend) */
  async signUp(input: SignUpInput): Promise<DataEnvelope<User>> {
    return this.request<DataEnvelope<User>>("/signup", "POST", input);
  }

  /** GET /users/me -> user */
  async getMe(): Promise<User> {
    return this.request<User>("/users/me", "GET");
  }

  /** PATCH /users/me -> { data: user } */
  async updateMe(input: UpdateProfileInput): Promise<User> {
    const res = await this.request<DataEnvelope<User>>("/users/me", "PATCH", input);
    return res.data;
  }

  /** GET /items -> ClothingItem[] (public read) */
  async getItems(): Promise<ClothingItem[]> {
    return this.request<ClothingItem[]>("/items", "GET");
  }

  /** POST /items -> 201 { data: item } */
  async addItem(input: AddItemInput): Promise<ClothingItem> {
    const res = await this.request<DataEnvelope<ClothingItem>>("/items", "POST", input);
    return res.data;
  }

  /** DELETE /items/:id */
  async deleteItem(id: string): Promise<void> {
    await this.request<DataEnvelope<ClothingItem>>(`/items/${id}`, "DELETE");
  }

  /** PUT /items/:id/likes -> { data: item } */
  async likeItem(id: string): Promise<ClothingItem> {
    const res = await this.request<DataEnvelope<ClothingItem>>(`/items/${id}/likes`, "PUT");
    return res.data;
  }

  /** DELETE /items/:id/likes -> { data: item } */
  async unlikeItem(id: string): Promise<ClothingItem> {
    const res = await this.request<DataEnvelope<ClothingItem>>(`/items/${id}/likes`, "DELETE");
    return res.data;
  }

  /** GET /favorites -> Favorite[] */
  async getFavorites(): Promise<Favorite[]> {
    return this.request<Favorite[]>("/favorites", "GET");
  }

  /** POST /favorites -> 201 { data: favorite } */
  async addFavorite(input: AddFavoriteInput): Promise<Favorite> {
    const res = await this.request<DataEnvelope<Favorite>>("/favorites", "POST", input);
    return res.data;
  }

  /** DELETE /favorites/:id */
  async deleteFavorite(id: string): Promise<void> {
    await this.request<DataEnvelope<Favorite>>(`/favorites/${id}`, "DELETE");
  }

  /** GET /gallery -> GalleryItem[] */
  async getGallery(): Promise<GalleryItem[]> {
    return this.request<GalleryItem[]>("/gallery", "GET");
  }

  /** POST /gallery/link -> 201 { data: item } */
  async addGalleryLink(input: AddGalleryLinkInput): Promise<GalleryItem> {
    const res = await this.request<DataEnvelope<GalleryItem>>("/gallery/link", "POST", input);
    return res.data;
  }

  /** POST /gallery/upload (multipart, field "file", 25MB max) -> 201 { data: item } */
  async uploadGalleryFile(file: GalleryUploadFile, title?: string): Promise<GalleryItem> {
    const headers: Record<string, string> = {};
    if (this.getToken) {
      const token = await this.getToken();
      if (token) headers.Authorization = `Bearer ${token}`;
    }
    const form = new FormData();
    // React Native's FormData accepts { uri, name, type } file descriptors;
    // the cast documents the platform-specific shape for the DOM-typed FormData.
    form.append("file", {
      uri: file.uri,
      name: file.name,
      type: file.mimeType,
    } as unknown as Blob);
    if (title) form.append("title", title);
    const response = await fetch(`${this.baseUrl}/gallery/upload`, {
      method: "POST",
      headers,
      body: form,
    });
    const text = await response.text();
    if (!response.ok) {
      throw new ApiError(response.status, text);
    }
    return (JSON.parse(text) as DataEnvelope<GalleryItem>).data;
  }

  /** DELETE /gallery/:id */
  async deleteGalleryItem(id: string): Promise<void> {
    await this.request<DataEnvelope<GalleryItem>>(`/gallery/${id}`, "DELETE");
  }

  /** GET /users/:id/public -> { _id, name, avatar } (no auth) */
  async getPublicUser(id: string): Promise<PublicUser> {
    return this.request<PublicUser>(
      `/users/${encodeURIComponent(id)}/public`,
      "GET",
    );
  }

  /** GET /fits -> Fit[] (bare array, newest first) */
  async getFits(params: GetFitsParams = {}): Promise<Fit[]> {
    return this.request<Fit[]>(`/fits${toQuery(params)}`, "GET");
  }

  /** POST /fits -> 201 { data: fit } */
  async createFit(input: CreateFitInput): Promise<Fit> {
    const res = await this.request<DataEnvelope<Fit>>("/fits", "POST", input);
    return res.data;
  }

  /** DELETE /fits/:id (owner only) */
  async deleteFit(id: string): Promise<void> {
    await this.request(`/fits/${encodeURIComponent(id)}`, "DELETE");
  }

  /** PUT /fits/:id/likes -> { data: fit } */
  async likeFit(id: string): Promise<Fit> {
    const res = await this.request<DataEnvelope<Fit>>(
      `/fits/${encodeURIComponent(id)}/likes`,
      "PUT",
    );
    return res.data;
  }

  /** DELETE /fits/:id/likes -> { data: fit } */
  async unlikeFit(id: string): Promise<Fit> {
    const res = await this.request<DataEnvelope<Fit>>(
      `/fits/${encodeURIComponent(id)}/likes`,
      "DELETE",
    );
    return res.data;
  }

  /** GET /battles -> Battle[] (bare array, newest first) */
  async getBattles(params: GetBattlesParams = {}): Promise<Battle[]> {
    return this.request<Battle[]>(`/battles${toQuery(params)}`, "GET");
  }

  /** POST /battles -> 201 { data: battle } */
  async createBattle(input: CreateBattleInput): Promise<Battle> {
    const res = await this.request<DataEnvelope<Battle>>("/battles", "POST", input);
    return res.data;
  }

  /** POST /battles/:id/vote -> { data: battle } */
  async voteBattle(id: string, pick: BattlePick): Promise<Battle> {
    const res = await this.request<DataEnvelope<Battle>>(
      `/battles/${encodeURIComponent(id)}/vote`,
      "POST",
      { pick },
    );
    return res.data;
  }

  /** POST /battles/:id/close -> { data: battle } (creator only) */
  async closeBattle(id: string): Promise<Battle> {
    const res = await this.request<DataEnvelope<Battle>>(
      `/battles/${encodeURIComponent(id)}/close`,
      "POST",
    );
    return res.data;
  }
}
