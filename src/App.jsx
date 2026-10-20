import Home from './Home';

export default function App() {
  // Chưa có đăng nhập: trả về null => nút "Thêm vào giỏ" sẽ báo cần đăng nhập.
  // Khi dùng Supabase Auth ở frontend, thay bằng:
  // async () => (await supabase.auth.getSession()).data.session?.access_token
  const getAccessToken = async () => null;

  return <Home getAccessToken={getAccessToken} />;
}
