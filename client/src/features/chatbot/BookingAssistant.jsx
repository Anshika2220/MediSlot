import { useState } from 'react';
import { Bot, CalendarClock, Check, LoaderCircle, Send } from 'lucide-react';
import api from '../../services/api';

let messageId = 0;

export default function BookingAssistant({ onBookingComplete }) {
  const [messages, setMessages] = useState([
    {
      id: messageId++,
      role: 'assistant',
      text: 'Tell me the specialty, date, and time you prefer, and I will check real clinic availability.',
    },
  ]);
  const [context, setContext] = useState({});
  const [draft, setDraft] = useState('');
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [sending, setSending] = useState(false);
  const [confirming, setConfirming] = useState(false);

  async function sendMessage(event) {
    event.preventDefault();
    const message = draft.trim();
    if (!message || sending) return;

    setDraft('');
    setSelectedSlot(null);
    setMessages((current) => [...current, { id: messageId++, role: 'patient', text: message }]);
    setSending(true);

    try {
      const response = await api.post('/chat/message', { message, context });
      const result = response.data.data;
      setContext(result.context || {});
      setMessages((current) => [
        ...current,
        {
          id: messageId++,
          role: 'assistant',
          text: result.reply,
          slots: result.slots || [],
        },
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          id: messageId++,
          role: 'assistant',
          text: error.response?.data?.message || 'I could not check availability. Please try again.',
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  async function confirmBooking() {
    if (!selectedSlot || confirming) return;
    setConfirming(true);
    try {
      const response = await api.post('/chat/confirm-booking', {
        doctorId: selectedSlot.doctorId,
        slotStartTime: selectedSlot.slotStartTime,
      });
      setMessages((current) => [
        ...current,
        { id: messageId++, role: 'assistant', text: response.data.data.reply },
      ]);
      setSelectedSlot(null);
      onBookingComplete?.();
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          id: messageId++,
          role: 'assistant',
          text: error.response?.data?.message || 'The booking could not be confirmed. Please choose another slot.',
        },
      ]);
      if (error.response?.status === 409) setSelectedSlot(null);
    } finally {
      setConfirming(false);
    }
  }

  return (
    <section className="mb-7 overflow-hidden border border-[var(--border)] bg-[var(--surface)]" aria-labelledby="booking-assistant-title">
      <header className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center bg-[var(--card)] text-[var(--accent)]">
            <Bot size={17} aria-hidden="true" />
          </div>
          <div>
            <h2 id="booking-assistant-title" className="text-sm font-semibold text-[var(--text)]">Booking assistant</h2>
            <p className="text-[11px] text-[var(--muted)]">Appointment scheduling only</p>
          </div>
        </div>
        <span className="hidden items-center gap-1 text-[11px] text-[var(--muted)] sm:flex">
          <CalendarClock size={14} aria-hidden="true" /> Real availability
        </span>
      </header>

      <div className="max-h-80 space-y-3 overflow-y-auto px-4 py-4" aria-live="polite" aria-relevant="additions">
        {messages.map((message) => (
          <div key={message.id} className={`flex ${message.role === 'patient' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[92%] sm:max-w-[82%] ${message.role === 'patient' ? 'bg-[var(--card)]' : 'bg-transparent'}`}>
              <p className={`text-xs leading-relaxed ${message.role === 'patient' ? 'text-[var(--text)]' : 'text-[var(--muted)]'}`}>
                {message.text}
              </p>
              {message.slots?.length > 0 && (
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {message.slots.map((slot) => {
                    const isSelected = selectedSlot?.slotStartTime === slot.slotStartTime
                      && selectedSlot?.doctorId === slot.doctorId;
                    return (
                      <button
                        key={`${slot.doctorId}-${slot.slotStartTime}`}
                        type="button"
                        onClick={() => setSelectedSlot(slot)}
                        aria-pressed={isSelected}
                        className={`border px-3 py-2 text-left transition-colors ${
                          isSelected
                            ? 'border-[var(--accent)] bg-[rgba(214,198,90,0.12)]'
                            : 'border-[var(--border)] bg-[var(--surface)] hover:border-[var(--accent)]'
                        }`}
                      >
                        <span className="block text-xs font-semibold text-[var(--text)]">{slot.doctorName}</span>
                        <span className="block text-[11px] text-[var(--muted)]">{slot.specialty} · {slot.date} · {slot.startTime}–{slot.endTime}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ))}
        {sending && (
          <div className="flex items-center gap-2 text-xs text-[var(--muted)]" role="status">
            <LoaderCircle size={14} className="animate-spin" aria-hidden="true" /> Checking availability…
          </div>
        )}
      </div>

      {selectedSlot && (
        <div className="flex flex-col gap-3 border-t border-[var(--border)] bg-[var(--card)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-[var(--text)]">
            Selected: {selectedSlot.doctorName}, {selectedSlot.date} at {selectedSlot.startTime}
          </p>
          <button type="button" className="btn btn-primary text-xs" onClick={confirmBooking} disabled={confirming}>
            {confirming ? <LoaderCircle size={14} className="animate-spin" /> : <Check size={14} />}
            {confirming ? 'Confirming…' : 'Confirm booking'}
          </button>
        </div>
      )}

      <form onSubmit={sendMessage} className="flex items-end gap-2 border-t border-[var(--border)] p-3">
        <label className="sr-only" htmlFor="booking-chat-message">Message the booking assistant</label>
        <textarea
          id="booking-chat-message"
          rows={1}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            }
          }}
          placeholder="For example: Dermatologist tomorrow afternoon"
          maxLength={1000}
          disabled={sending || confirming}
          className="min-h-10 resize-y text-xs"
        />
        <button type="submit" className="btn btn-primary h-10 w-10 shrink-0 p-0" aria-label="Send message" disabled={!draft.trim() || sending || confirming}>
          <Send size={15} />
        </button>
      </form>
      <p className="px-4 pb-3 text-[10px] text-[var(--muted)]">This assistant helps schedule appointments and does not provide diagnosis or treatment advice.</p>
    </section>
  );
}