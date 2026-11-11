import { fireEvent, render, screen, waitFor, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({ getUser: vi.fn(), signUp: vi.fn(), signInWithPassword: vi.fn(), resend: vi.fn() }));
const nav = vi.hoisted(() => vi.fn());
vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth } }));
vi.mock("@/integrations/lovable/index", () => ({ lovable: { auth: { signInWithOAuth: vi.fn() } } }));
vi.mock("@tanstack/react-router", () => ({ createFileRoute: () => (options: unknown) => options, useNavigate: () => nav, Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a> }));
import { AuthPage } from "./auth";

beforeEach(() => { vi.resetAllMocks(); auth.getUser.mockResolvedValue({ data: { user: null } }); sessionStorage.clear(); });
afterEach(cleanup);
describe("Email confirmation recovery", () => {
  it("sends signup confirmations to the public auth page without granting access", async () => {
    auth.signUp.mockResolvedValue({ data: { session: null }, error: null });
    render(<AuthPage />);
    fireEvent.click(screen.getByRole("button", { name: "Create an account" }));
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "test@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "Example-pass-9284" } });
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));
    await waitFor(() => expect(auth.signUp).toHaveBeenCalledWith(expect.objectContaining({ options: expect.objectContaining({ emailRedirectTo: window.location.origin + "/auth" }) })));
    expect(nav).not.toHaveBeenCalled();
  });
  it("resends the signup email to the entered address and public callback", async () => {
    auth.resend.mockResolvedValue({ error: null });
    render(<AuthPage />);
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "friend@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Resend confirmation email" }));
    await waitFor(() => expect(auth.resend).toHaveBeenCalledWith({ type: "signup", email: "friend@example.com", options: { emailRedirectTo: window.location.origin + "/auth" } }));
    expect(nav).not.toHaveBeenCalled();
  });
  it("restores the submit control after a connection failure", async () => {
    auth.signInWithPassword.mockRejectedValue(new Error("Network failure"));
    render(<AuthPage />);
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "test@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "Example-pass-9284" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign in", exact: true }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Sign in", exact: true })).toBeEnabled());
    expect(auth.signInWithPassword).toHaveBeenCalledTimes(1);
    expect(nav).not.toHaveBeenCalled();
  });
});