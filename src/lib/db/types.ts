import type { Project, Session, User } from "@/lib/types";

export interface DataStore {
  readonly kind: "file" | "supabase";

  getUser(id: string): Promise<User | null>;
  getUserByEmail(email: string): Promise<User | null>;
  createUser(user: User): Promise<User>;
  updateUser(id: string, patch: Partial<User>): Promise<User>;

  getSession(token: string): Promise<Session | null>;
  createSession(session: Session): Promise<Session>;
  deleteSession(token: string): Promise<void>;

  listProjects(userId: string): Promise<Project[]>;
  getProject(id: string): Promise<Project | null>;
  createProject(project: Project): Promise<Project>;
  updateProject(id: string, patch: Partial<Project>): Promise<Project>;
  deleteProject(id: string): Promise<void>;

  countProjects(userId: string): Promise<number>;
}
