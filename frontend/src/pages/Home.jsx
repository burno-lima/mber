import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import logo from '../assets/Logo.png';

const Home = () => {
  const [dishes, setDishes] = useState([]);
  const [todaySchedule, setTodaySchedule] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const hasSession = Boolean(localStorage.getItem('accessToken'));

  useEffect(() => {
    Promise.all([api.get('menu/'), api.get('schedules/today/')])
      .then(([menuResponse, scheduleResponse]) => {
        setDishes(menuResponse.data.results || menuResponse.data);
        setTodaySchedule(scheduleResponse.data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.response?.data?.detail || 'Não foi possível carregar o cardápio.');
        setLoading(false);
      });
  }, []);

  const categoryLabels = {
    almoco: 'Almoço',
    porcoes: 'Porções',
    bebidas: 'Bebidas',
  };

  const groupedDishes = useMemo(() => {
    return dishes.reduce((accumulator, dish) => {
      const category = dish.category || 'outros';
      if (!accumulator[category]) {
        accumulator[category] = [];
      }
      accumulator[category].push(dish);
      return accumulator;
    }, {});
  }, [dishes]);

  if (loading) return <div className="flex h-screen items-center justify-center">Carregando cardápio...</div>;

  const dishOfTheDay = todaySchedule?.dish;

  return (
    <div className="min-h-screen bg-[#fcf8f1] text-gray-900">
      <header className="border-b border-black/10 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-4">
            <img src={logo} alt="Logo" className="h-14 w-14 rounded-full object-contain" />
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-[#B22222]">Mber</p>
              <h1 className="text-xl font-black">Cardápio da casa</h1>
            </div>
          </div>
          <Link
            to={hasSession ? '/painel' : '/login'}
            className="rounded-full border border-[#B22222] px-4 py-2 text-sm font-semibold text-[#B22222] transition-colors hover:bg-[#B22222] hover:text-white"
          >
            {hasSession ? 'Voltar ao painel' : 'Acesso admin'}
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        {error ? (
          <div className="mb-6 rounded-2xl bg-red-100 px-5 py-4 text-red-700">
            {error}
          </div>
        ) : null}

        {todaySchedule && !todaySchedule.is_open ? (
          <section className="mb-10 rounded-[2rem] border border-black/10 bg-white p-8 shadow-sm">
            <p className="mb-2 text-sm uppercase tracking-[0.3em] text-[#B22222]">Programação de hoje</p>
            <h2 className="text-3xl font-black text-[#B22222]">Hoje estamos fechados</h2>
            <p className="mt-3 text-gray-600">
              {todaySchedule.note || 'Sem atendimento para a data de hoje.'}
            </p>
          </section>
        ) : null}

        {todaySchedule && todaySchedule.is_open && !dishOfTheDay ? (
          <section className="mb-10 rounded-[2rem] border border-black/10 bg-white p-8 shadow-sm">
            <p className="mb-2 text-sm uppercase tracking-[0.3em] text-[#B22222]">Programação de hoje</p>
            <h2 className="text-3xl font-black text-[#B22222]">Sem prato do dia programado</h2>
            <p className="mt-3 text-gray-600">
              {todaySchedule.note || 'Infelizmente não temos prato do dia disponível hoje. Confira as outras opções do cardápio.'}
            </p>
          </section>
        ) : null}

        {todaySchedule && todaySchedule.is_open && dishOfTheDay ? (
          <section className="mb-10 rounded-[2rem] bg-[#B22222] p-8 text-white shadow-2xl">
            <p className="mb-2 text-sm uppercase tracking-[0.3em] text-[#FFC107]">Prato do dia</p>
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-4xl font-black">{dishOfTheDay.name}</h2>
                <p className="mt-3 max-w-2xl text-base leading-relaxed text-white/85">{dishOfTheDay.description}</p>
              </div>
              <div className="rounded-2xl bg-white/10 px-5 py-4 text-3xl font-black text-[#FFC107]">
                R$ {Number(dishOfTheDay.price).toFixed(2)}
              </div>
            </div>
          </section>
        ) : null}

        <section className="space-y-8">
          {Object.entries(groupedDishes).map(([category, items]) => (
            <div key={category}>
              <h3 className="mb-4 text-2xl font-black text-[#B22222]">
                {categoryLabels[category] || 'Outros'}
              </h3>
              <div className="grid gap-4 md:grid-cols-2">
                {items.map((dish) => (
                  <article key={dish.id} className="rounded-3xl border border-black/5 bg-white p-5 shadow-sm">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h4 className="text-xl font-bold">{dish.name}</h4>
                        <p className="mt-2 text-sm leading-relaxed text-gray-600">{dish.description}</p>
                      </div>
                      {dish.dishDay ? (
                        <span className="rounded-full bg-[#FFC107] px-3 py-1 text-xs font-bold uppercase tracking-wide text-black">
                          Destaque
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-5 flex items-center justify-between border-t border-black/5 pt-4">
                      <span className="text-sm font-medium text-gray-500">
                        {dish.available ? 'Disponível' : 'Indisponível'}
                      </span>
                      <span className="text-xl font-black text-[#B22222]">
                        R$ {Number(dish.price).toFixed(2)}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
};

export default Home;