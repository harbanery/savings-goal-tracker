import LoginView from "@/features/auth/components/ui/LoginView";

/**
 * Feature module halaman Login: UI login Google (GoogleButton + pesan
 * error OAuth) hidup di src/features/auth — section ini hanya entry
 * point tipis yang meneruskan status konfigurasi Google OAuth.
 */
export default function LoginSection({
  configured,
}: {
  configured: boolean;
}) {
  return <LoginView configured={configured} />;
}
