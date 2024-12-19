'use client';
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import DatePicker from 'react-datepicker';
import {
  format,
  addHours,
  subHours,
  isWithinInterval,
  isSameDay,
} from 'date-fns';
import { IoLocationOutline } from 'react-icons/io5';
import { FaCheckCircle, FaTimesCircle } from 'react-icons/fa';
import { Html5Qrcode } from 'html5-qrcode';
import 'react-datepicker/dist/react-datepicker.css';
import './calendar.css';

export default function Home() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [events, setEvents] = useState([]);
  const [showScanner, setShowScanner] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [admittedPeople, setAdmittedPeople] = useState([]);
  const scannerRef = useRef(null);
  const audioRef = useRef(null);

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    if (showScanner && !scannerRef.current) {
      scannerRef.current = new Html5Qrcode('reader');
      startScanner();
    } else if (!showScanner && scannerRef.current) {
      scannerRef.current.stop().then(() => {
        scannerRef.current = null;
      });
    }
  }, [showScanner]);

  const startScanner = () => {
    if (scannerRef.current) {
      scannerRef.current
        .start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: 250 },
          onScanSuccess,
          onScanError
        )
        .catch((err) => {
          console.error('Failed to start scanner:', err);
          alert(
            'Camera access is required to scan QR codes. Please allow camera access and try again.'
          );
        });
    }
  };

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('event_date', { ascending: true });

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  };

  const isTicketValid = (eventDate) => {
    const now = new Date();
    const eventDateTime = new Date(eventDate);
    const eventWindow = {
      start: subHours(eventDateTime, 12), // 12 hours change back to 6 after testing
      end: addHours(eventDateTime, 36), // Extended to 36 hours after start
    };

    return isWithinInterval(now, eventWindow);
  };

  const onScanSuccess = async (decodedText) => {
    if (!selectedEvent) {
      setScanResult({
        status: 'error',
        message: 'Please select an event first',
      });
      return;
    }

    if (scannerRef.current) {
      scannerRef.current.pause(true);
    }

    try {
      console.log('Scanning QR code:', decodedText);
      const { data: ticket, error: ticketError } = await supabase
        .from('userevents')
        .select(
          `
          id,
          event_id,
          user_id,
          used,
          purchase_date,
          events (
            id,
            event_name,
            event_date
          ),
          users (
            id,
            first_name,
            last_name
          )
        `
        )
        .eq('qr_code', decodedText)
        .maybeSingle();

      if (ticketError) throw ticketError;
      if (!ticket) {
        setScanResult({
          status: 'error',
          message: 'Invalid ticket - not found in system',
        });
        return;
      }

      if (ticket.event_id !== selectedEvent.id) {
        setScanResult({
          status: 'error',
          message: `This ticket is for "${
            ticket.events.event_name
          }" on ${format(
            new Date(ticket.events.event_date),
            'MMM d, yyyy'
          )}. Not valid for this event.`,
        });
        return;
      }

      if (ticket.used) {
        setScanResult({
          status: 'error',
          message: 'Ticket has already been used',
        });
        return;
      }

      if (!isTicketValid(ticket.events.event_date)) {
        setScanResult({
          status: 'error',
          message:
            'Ticket is not valid at this time. Entry is allowed from 2 hours before until 36 hours after event start.',
        });
        return;
      }

      const { data: existingCheckin } = await supabase
        .from('checkins')
        .select('id')
        .match({
          user_id: ticket.user_id,
          event_id: ticket.event_id,
        })
        .maybeSingle();

      if (existingCheckin) {
        setScanResult({
          status: 'error',
          message: `${ticket.users.first_name} ${ticket.users.last_name} is already checked in to this event.`,
        });
        return;
      }

      // Begin transaction-like operations
      // 1. Mark ticket as used
      const { error: updateError } = await supabase
        .from('userevents')
        .update({ used: true })
        .eq('id', ticket.id);

      if (updateError) throw updateError;

      // 2. Create check-in record
      const { error: checkinError } = await supabase.from('checkins').insert({
        user_id: ticket.user_id,
        event_id: ticket.event_id,
        checked_in_at: new Date().toISOString(),
      });

      if (checkinError) throw checkinError;

      // 3. Create timeline event
      const { error: timelineError } = await supabase
        .from('timeline_events')
        .insert({
          event_id: ticket.event_id,
          user_id: ticket.user_id,
          event_type: 'checkin',
          description: `${ticket.users.first_name} ${ticket.users.last_name} has arrived!`,
          created_at: new Date().toISOString(),
        });

      if (timelineError) throw timelineError;

      setScanResult({
        status: 'success',
        message: `Welcome, ${ticket.users.first_name} ${ticket.users.last_name}! Check-in successful.`,
      });

      await fetchAdmittedPeople();

      if (audioRef.current) {
        audioRef.current.play();
      }
    } catch (error) {
      console.error('Error processing ticket:', error);
      setScanResult({
        status: 'error',
        message: 'Error processing ticket. Please try again.',
      });
    } finally {
      setShowScanner(false);
    }
  };

  const onScanError = (error) => {
    console.warn('QR Scan Error:', error);
  };

  const fetchAdmittedPeople = async () => {
    if (!selectedEvent) return;

    try {
      const { data, error } = await supabase
        .from('userevents')
        .select(
          `
          id,
          purchase_date,
          users (
            first_name,
            last_name
          )
        `
        )
        .eq('event_id', selectedEvent.id)
        .eq('used', true)
        .order('purchase_date', { ascending: false });

      if (error) throw error;
      setAdmittedPeople(data || []);
    } catch (error) {
      console.error('Error fetching admitted people:', error);
    }
  };

  const handleScannerToggle = () => {
    setShowScanner(!showScanner);
    setScanResult(null);
  };

  const handleDateChange = (date) => {
    setSelectedDate(date);
    setSelectedEvent(null);
    setScanResult(null);
    setShowCalendar(false);
  };

  const getEventsForSelectedDate = () => {
    return events.filter((event) =>
      isSameDay(new Date(event.event_date), selectedDate)
    );
  };

  const hasEventOnDate = (date) => {
    return events.some((event) => isSameDay(new Date(event.event_date), date));
  };

  return (
    <div className="container mx-auto p-4 max-w-md bg-black text-white min-h-screen">
      <h1 className="text-4xl font-bold mb-4 text-left text-white font-bebas-neue">
        {format(selectedDate, 'MMMM d, yyyy')}
      </h1>

      <button
        className="mb-4 p-2 bg-[#333333] text-white rounded w-full font-oswald"
        onClick={() => setShowCalendar(!showCalendar)}
      >
        {showCalendar ? 'Hide Calendar' : 'Change Date'}
      </button>

      {showCalendar && (
        <div className="mb-4">
          <DatePicker
            selected={selectedDate}
            onChange={handleDateChange}
            inline
            className="!bg-[#333333] !text-white"
            renderDayContents={(day, date) => (
              <div className="relative">
                {day}
                {hasEventOnDate(date) && <div className="event-dot"></div>}
              </div>
            )}
          />
        </div>
      )}

      <select
        className="mb-4 p-2 border rounded w-full text-white bg-[#333333] font-oswald"
        value={selectedEvent?.id || ''}
        onChange={(e) => {
          const event = events.find((ev) => ev.id === e.target.value);
          setSelectedEvent(event);
          fetchAdmittedPeople();
          setScanResult(null);
        }}
      >
        <option value="">Select an event</option>
        {getEventsForSelectedDate().map((event) => (
          <option key={event.id} value={event.id}>
            {event.event_name} - {format(new Date(event.event_date), 'HH:mm')}
          </option>
        ))}
      </select>

      {selectedEvent && (
        <>
          <div className="mb-4 text-left">
            <h2 className="text-3xl font-bold text-white font-bebas-neue">
              {selectedEvent.event_name}
            </h2>
            <div className="flex items-center text-[#B0B0B0] font-oswald">
              <IoLocationOutline className="text-[#FF5252]" size={20} />
              <span className="ml-1">{selectedEvent.location}</span>
            </div>
          </div>

          <button
            className="mb-4 p-2 bg-[#FF5252] text-white rounded w-full font-oswald"
            onClick={handleScannerToggle}
          >
            {showScanner ? 'Hide Scanner' : 'Show Scanner'}
          </button>

          {showScanner && <div id="reader" className="mb-4"></div>}

          {scanResult && (
            <div
              className={`mb-4 p-4 rounded text-center ${
                scanResult.status === 'success' ? 'bg-green-700' : 'bg-red-700'
              } font-oswald flex items-center justify-center scan-result`}
            >
              {scanResult.status === 'success' ? (
                <FaCheckCircle size={24} className="mr-2" />
              ) : (
                <FaTimesCircle size={24} className="mr-2" />
              )}
              <span>{scanResult.message}</span>
            </div>
          )}

          <h2 className="text-2xl font-bold mb-2 text-white font-bebas-neue">
            Admitted People
          </h2>
          <ul className="divide-y divide-gray-700 font-oswald">
            {admittedPeople.map((ticket) => (
              <li key={ticket.id} className="py-2">
                {ticket.users.first_name} {ticket.users.last_name} -{' '}
                {new Date(ticket.purchase_date).toLocaleTimeString()}
              </li>
            ))}
          </ul>
        </>
      )}

      <audio ref={audioRef} src="/success-chime.mp3" />
    </div>
  );
}
