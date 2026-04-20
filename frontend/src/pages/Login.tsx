import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { api, setAuthToken } from '../lib/api';

export default function Login() {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('factory@2024');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { username, password });
      setAuthToken(data.token);
      localStorage.setItem('factory_pos_user', JSON.stringify(data.user));
      navigate('/dashboard');
    } catch {
      setError('Invalid username or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F8F9FA] p-4">
      <Card className="w-full max-w-md">
        <h1 className="mb-2 text-center text-2xl font-bold">Factory POS</h1>
        <p className="mb-6 text-center text-sm text-slate-500">
          Dev login: admin / factory@2024
        </p>
        <form className="space-y-3" onSubmit={submit}>
          <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" />
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
          />
          {error && <div className="text-sm text-[#DC2626]">{error}</div>}
          <Button className="w-full" disabled={loading}>
            {loading ? 'Signing in...' : 'Login'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
