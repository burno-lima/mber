import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';

const emptyForm = {
  name: '',
  description: '',
  price: '',
  category: 'almoco',
  available: true,
  dishDay: false,
};

function AdminDashboard() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [specialOptions, setSpecialOptions] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [scheduleMessage, setScheduleMessage] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingSchedules, setSavingSchedules] = useState(false);
  const [weekMode, setWeekMode] = useState('current');
  const [isScheduleExpanded, setIsScheduleExpanded] = useState(true);
  const [message, setMessage] = useState('');

  const weekdayLabels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];
  const categoryLabels = {
    almoco: 'Almoço',
    porcoes: 'Porções',
    bebidas: 'Bebidas',
  };

  const formatDate = (date) => date.toISOString().slice(0, 10);

  const getCurrentMonday = () => {
    const today = new Date();
    const daysSinceMonday = (today.getDay() + 6) % 7;
    const monday = new Date(today);
    monday.setDate(today.getDate() - daysSinceMonday);
    return monday;
  };

  const getBaseMonday = () => {
    const monday = getCurrentMonday();
    if (weekMode === 'next') {
      const nextMonday = new Date(monday);
      nextMonday.setDate(monday.getDate() + 7);
      return nextMonday;
    }
    return monday;
  };

  const getWeekDates = () => {
    const monday = getBaseMonday();
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + index);
      return date;
    });
  };

  const getWeekRange = (mode) => {
    const monday = getCurrentMonday();
    const base = new Date(monday);
    if (mode === 'next') {
      base.setDate(base.getDate() + 7);
    } else if (mode === 'previous') {
      base.setDate(base.getDate() - 7);
    }

    const end = new Date(base);
    end.setDate(base.getDate() + 6);

    return {
      startDate: formatDate(base),
      endDate: formatDate(end),
    };
  };

  const loadSpecialOptions = async () => {
    const response = await api.get('menu/?special_candidates=true');
    setSpecialOptions(response.data.results || response.data);
  };

  const loadSchedules = async () => {
    const weekDates = getWeekDates();
    const startDate = formatDate(weekDates[0]);
    const endDate = formatDate(weekDates[weekDates.length - 1]);

    try {
      const response = await api.get(`schedules/?start_date=${startDate}&end_date=${endDate}`);
      const byDate = new Map((response.data.results || response.data).map((item) => [item.date, item]));

      const hydrated = weekDates.map((date) => {
        const key = formatDate(date);
        const existing = byDate.get(key);

        return {
          id: existing?.id || null,
          date: key,
          weekday: weekdayLabels[date.getDay()],
          is_open: existing ? existing.is_open : true,
          dish_id: existing?.dish?.id || '',
          note: existing?.note || '',
        };
      });

      setSchedules(hydrated);
    } catch (error) {
      setScheduleMessage('Não foi possível carregar a agenda da semana.');
    }
  };

  const loadItems = async () => {
    setLoading(true);
    try {
      const response = await api.get('menu/');
      setItems(response.data.results || response.data);
      await loadSpecialOptions();
      await loadSchedules();
    } catch (error) {
      setMessage('Não foi possível carregar os itens do cardápio.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, []);

  useEffect(() => {
    loadSchedules();
  }, [weekMode]);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((currentForm) => ({
      ...currentForm,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage('');

    const payload = {
      ...form,
      price: Number(form.price),
    };

    try {
      if (editingId) {
        await api.put(`menu/${editingId}/`, payload);
        setMessage('Item atualizado com sucesso.');
      } else {
        await api.post('menu/', payload);
        setMessage('Item criado com sucesso.');
      }

      resetForm();
      await loadItems();
    } catch (error) {
      setMessage('Não foi possível salvar o item. Verifique os campos e tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    setForm({
      name: item.name,
      description: item.description,
      price: item.price,
      category: item.category,
      available: item.available,
      dishDay: item.dishDay,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    const shouldDelete = window.confirm('Deseja excluir este item do cardápio?');

    if (!shouldDelete) {
      return;
    }

    try {
      await api.delete(`menu/${id}/`);
      setMessage('Item removido com sucesso.');
      await loadItems();
    } catch (error) {
      setMessage('Não foi possível excluir este item.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('currentUser');
    navigate('/login');
  };

  const handleScheduleChange = (date, field, value) => {
    setSchedules((currentSchedules) =>
      currentSchedules.map((item) => {
        if (item.date !== date) {
          return item;
        }

        if (field === 'is_open' && !value) {
          return { ...item, is_open: false, dish_id: '' };
        }

        return { ...item, [field]: value };
      })
    );
  };

  const saveAllSchedules = async () => {
    setSavingSchedules(true);
    setScheduleMessage('');

    const invalid = schedules.find((item) => item.is_open && !item.dish_id);
    if (invalid) {
      setScheduleMessage(`Selecione um prato para ${invalid.weekday} antes de salvar.`);
      setSavingSchedules(false);
      return;
    }

    const payload = schedules.map((item) => ({
      date: item.date,
      is_open: item.is_open,
      dish_id: item.is_open ? Number(item.dish_id) : null,
      note: item.note,
    }));

    try {
      await api.post('schedules/bulk_upsert/', { schedules: payload });
      setScheduleMessage('Agenda da semana salva com sucesso.');
      await loadSchedules();
    } catch (error) {
      setScheduleMessage('Falha ao salvar agenda da semana. Verifique os pratos selecionados.');
    } finally {
      setSavingSchedules(false);
    }
  };

  const copyFromPreviousWeek = async () => {
    setScheduleMessage('');
    try {
      const sourceMode = weekMode === 'next' ? 'current' : 'previous';
      const sourceRange = getWeekRange(sourceMode);
      const response = await api.get(
        `schedules/?start_date=${sourceRange.startDate}&end_date=${sourceRange.endDate}`
      );

      const sourceItems = response.data.results || response.data;
      if (!sourceItems.length) {
        setScheduleMessage('Não há agenda na semana anterior para copiar.');
        return;
      }

      const byWeekday = {};
      sourceItems.forEach((item) => {
        const weekday = new Date(`${item.date}T00:00:00`).getDay();
        byWeekday[weekday] = item;
      });

      setSchedules((current) =>
        current.map((item) => {
          const weekday = new Date(`${item.date}T00:00:00`).getDay();
          const source = byWeekday[weekday];
          if (!source) {
            return item;
          }

          return {
            ...item,
            is_open: source.is_open,
            dish_id: source.dish?.id || '',
            note: source.note || '',
          };
        })
      );

      setScheduleMessage('Dados da semana anterior copiados. Clique em "Salvar semana" para confirmar.');
      setIsScheduleExpanded(true);
    } catch (error) {
      setScheduleMessage('Não foi possível copiar os dados da semana anterior.');
    }
  };

  const groupedItems = items.reduce((accumulator, item) => {
    const key = item.category || 'outros';
    if (!accumulator[key]) {
      accumulator[key] = [];
    }
    accumulator[key].push(item);
    return accumulator;
  }, {});

  return (
    <div className="min-h-screen bg-[#fcf8f1] px-6 py-8 text-gray-900">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <header className="flex flex-col gap-4 rounded-[2rem] bg-[#B22222] px-6 py-6 text-white shadow-2xl md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-[#FFC107]">Painel do proprietário</p>
            <h1 className="mt-2 text-3xl font-black">Gerenciar cardápio</h1>
            <p className="mt-2 max-w-2xl text-sm text-white/85">
              Crie, edite e remova produtos sem complicação.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => navigate('/cardapio')}
              className="rounded-full border border-white/30 px-4 py-2 text-sm font-semibold transition-colors hover:bg-white/10"
            >
              Ver cardápio
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-full bg-[#FFC107] px-4 py-2 text-sm font-bold text-black transition-colors hover:bg-[#FFD54F]"
            >
              Sair
            </button>
          </div>
        </header>

        {message ? (
          <div className="rounded-2xl bg-white px-5 py-4 shadow-sm">{message}</div>
        ) : null}

        <section className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <form onSubmit={handleSubmit} className="rounded-[2rem] bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-[#B22222]">
                  {editingId ? 'Editar item' : 'Novo item'}
                </h2>
                <p className="text-sm text-gray-500">Formulário simples para o administrador.</p>
              </div>
              {editingId ? (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700"
                >
                  Cancelar
                </button>
              ) : null}
            </div>

            <div className="grid gap-4">
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Nome do produto"
                className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none focus:border-[#B22222]"
                required
              />
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder="Descrição"
                className="min-h-28 w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none focus:border-[#B22222]"
                required
              />
              <div className="grid gap-4 md:grid-cols-2">
                <input
                  name="price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.price}
                  onChange={handleChange}
                  placeholder="Preço"
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none focus:border-[#B22222]"
                  required
                />
                <select
                  name="category"
                  value={form.category}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none focus:border-[#B22222]"
                >
                  <option value="almoco">Almoço</option>
                  <option value="porcoes">Porções</option>
                  <option value="bebidas">Bebidas</option>
                </select>
              </div>

              <label className="flex items-center gap-3 rounded-2xl border border-gray-200 px-4 py-3">
                <input
                  type="checkbox"
                  name="available"
                  checked={form.available}
                  onChange={handleChange}
                />
                <span className="text-sm font-medium">Produto disponível</span>
              </label>

              <label className="flex items-center gap-3 rounded-2xl border border-gray-200 px-4 py-3">
                <input
                  type="checkbox"
                  name="dishDay"
                  checked={form.dishDay}
                  onChange={handleChange}
                />
                <span className="text-sm font-medium">Prato do dia</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="mt-6 w-full rounded-2xl bg-[#B22222] px-5 py-4 text-sm font-black uppercase tracking-widest text-white transition-colors hover:bg-[#8e1b1b]"
            >
              {saving ? 'Salvando...' : 'Salvar item'}
            </button>
          </form>

          <div className="rounded-[2rem] bg-white p-6 shadow-sm">
            <div className="mb-6">
              <h2 className="text-2xl font-black text-[#B22222]">Itens cadastrados</h2>
              <p className="text-sm text-gray-500">Lista atual do cardápio público separada por categoria.</p>
            </div>

            {loading ? (
              <p className="text-sm text-gray-500">Carregando itens...</p>
            ) : items.length === 0 ? (
              <p className="text-sm text-gray-500">Nenhum item cadastrado ainda.</p>
            ) : (
              <div className="space-y-6">
                {Object.entries(groupedItems).map(([category, categoryItems]) => (
                  <div key={category}>
                    <h3 className="mb-3 text-sm font-black uppercase tracking-wide text-[#B22222]">
                      {categoryLabels[category] || 'Outros'}
                    </h3>
                    <div className="space-y-4">
                      {categoryItems.map((item) => (
                        <article key={item.id} className="rounded-2xl border border-gray-100 p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <h3 className="text-lg font-bold">{item.name}</h3>
                              <p className="text-sm text-gray-500">{item.description}</p>
                            </div>
                            <span className="text-lg font-black text-[#B22222]">
                              R$ {Number(item.price).toFixed(2)}
                            </span>
                          </div>

                          <div className="mt-4 flex flex-wrap gap-2 text-xs">
                            <span className="rounded-full bg-gray-100 px-3 py-1">
                              {item.available ? 'Disponível' : 'Indisponível'}
                            </span>
                            {item.dishDay ? (
                              <span className="rounded-full bg-[#FFC107] px-3 py-1 font-bold text-black">
                                Prato do dia
                              </span>
                            ) : null}
                          </div>

                          <div className="mt-4 flex gap-3">
                            <button
                              type="button"
                              onClick={() => handleEdit(item)}
                              className="rounded-full border border-[#B22222] px-4 py-2 text-sm font-semibold text-[#B22222]"
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(item.id)}
                              className="rounded-full border border-red-200 px-4 py-2 text-sm font-semibold text-red-600"
                            >
                              Excluir
                            </button>
                          </div>
                        </article>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="rounded-[2rem] bg-white p-6 shadow-sm">
          <div
            className="mb-4 cursor-pointer rounded-2xl border border-gray-100 px-4 py-4 transition-colors hover:bg-[#fcf8f1]"
            onClick={() => setIsScheduleExpanded((value) => !value)}
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                setIsScheduleExpanded((value) => !value);
              }
            }}
          >
            <div>
              <h2 className="text-2xl font-black text-[#B22222]">Agenda do prato do dia</h2>
              <p className="text-sm text-gray-500">
                Clique neste banner para {isScheduleExpanded ? 'recolher' : 'expandir'} a agenda.
              </p>
            </div>
          </div>

          <div className="mb-4 flex flex-wrap gap-2">
              <select
                value={weekMode}
                onChange={(event) => setWeekMode(event.target.value)}
                className="rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700"
              >
                <option value="current">Semana atual</option>
                <option value="next">Próxima semana</option>
              </select>

              <button
                type="button"
                onClick={copyFromPreviousWeek}
                disabled={savingSchedules}
                className="rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Copiar semana anterior
              </button>

              <button
                type="button"
                onClick={saveAllSchedules}
                disabled={!isScheduleExpanded || savingSchedules}
                className="rounded-full bg-[#B22222] px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {savingSchedules ? 'Salvando semana...' : 'Salvar semana'}
              </button>
          </div>

          {scheduleMessage ? (
            <div className="mb-4 rounded-2xl bg-[#fcf8f1] px-4 py-3 text-sm text-gray-700">
              {scheduleMessage}
            </div>
          ) : null}

          {isScheduleExpanded ? (
            <div className="grid gap-4">
              {schedules.map((scheduleItem) => (
                <article key={scheduleItem.date} className="rounded-2xl border border-gray-100 p-4">
                  <div className="grid gap-3 md:grid-cols-[100px_170px_1fr] md:items-center">
                    <div>
                      <p className="text-sm font-bold text-[#B22222]">{scheduleItem.weekday}</p>
                      <p className="text-xs text-gray-500">{scheduleItem.date}</p>
                    </div>

                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={scheduleItem.is_open}
                        onChange={(event) =>
                          handleScheduleChange(scheduleItem.date, 'is_open', event.target.checked)
                        }
                      />
                      Dia aberto
                    </label>

                    <div className="grid gap-2 md:grid-cols-[1fr_1fr]">
                      <select
                        value={scheduleItem.dish_id}
                        onChange={(event) =>
                          handleScheduleChange(scheduleItem.date, 'dish_id', event.target.value)
                        }
                        disabled={!scheduleItem.is_open}
                        className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#B22222] disabled:bg-gray-100"
                      >
                        <option value="">Selecione o prato</option>
                        {specialOptions.map((item) => (
                          <option key={item.id} value={item.id}>{item.name}</option>
                        ))}
                      </select>

                      <input
                        type="text"
                        value={scheduleItem.note}
                        onChange={(event) =>
                          handleScheduleChange(scheduleItem.date, 'note', event.target.value)
                        }
                        placeholder="Observação (opcional)"
                        className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#B22222]"
                      />
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-gray-200 px-4 py-6 text-center text-sm text-gray-500">
              Agenda recolhida para facilitar a visualização do painel.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default AdminDashboard;