import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import logo from '../assets/Logo.png';

function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const token = localStorage.getItem('accessToken');

  if (token) {
    return <Navigate to="/painel" replace />;
  }

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await api.post('auth/login/', {
        username,
        password,
      });

      localStorage.setItem('accessToken', response.data.access);
      localStorage.setItem('refreshToken', response.data.refresh);
      localStorage.setItem('currentUser', JSON.stringify(response.data.user));

      navigate('/painel', { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || 'Não foi possível entrar com essas credenciais.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-full bg-white">
      <div className="hidden md:flex w-1/2 bg-[#B22222] items-center justify-center">
        <img 
          src={logo} 
          alt="Logo" 
          className="w-2/3 object-contain drop-shadow-2xl" 
        />
      </div>

      <div className="w-full md:w-1/2 flex items-center justify-center p-8">
        <form onSubmit={handleLogin} className="w-full max-w-md">
          <h1 className="text-3xl font-bold mb-2 text-gray-800">Boas vindas ao seu cardápio</h1>
          <p className="text-gray-500 mb-8 font-medium">Log in</p>

          <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            Acesso restrito ao proprietário ou administrador.
          </div>

          {error ? (
            <div className="mb-4 rounded-lg bg-red-100 px-4 py-3 text-sm font-medium text-red-700">
              {error}
            </div>
          ) : null}
          
          <div className="mb-4">
            <label className="block font-bold mb-2 text-sm text-gray-700 italic">Usuário</label>
            <input 
              type="text" 
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-red-600 transition-colors" 
              placeholder="Digite seu usuário" 
            />
          </div>

          <div className="mb-6">
            <label className="block font-bold mb-2 text-sm text-gray-700 italic">Senha</label>
            <input 
              type="password" 
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-red-600 transition-colors" 
              placeholder="Digite sua senha" 
            />
          </div>

          {/* BOTÃO AMARELO: 
              bg-[#FFC107] = Amarelo padrão
              hover:bg-[#FFD54F] = Um tom acima (mais claro/brilhante)
          */}
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-[#FFC107] hover:bg-[#FFD54F] text-black font-extrabold py-4 rounded-lg shadow-lg transform active:scale-95 transition-all uppercase tracking-widest"
          >
            {loading ? 'Entrando...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;