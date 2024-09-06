'use client';

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import DatePicker from 'react-datepicker';
import { format, isSameDay } from 'date-fns';
import { IoLocationOutline, IoCalendarOutline } from 'react-icons/io5';
import { FaCheckCircle, FaTimesCircle } from 'react-icons/fa';
import { Html5QrcodeScanner } from 'html5-qrcode';
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
      scannerRef.current = new Html5QrcodeScanner('reader', {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
        facingMode: { exact: 'environment' },
      });
      scannerRef.current.render(onScanSuccess, onScanError);
    } else if (!showScanner && scannerRef.current) {
      scannerRef.current.clear();
      scannerRef.current = null;
    }
  }, [showScanner]);

  async function fetchEvents() {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('event_date', { ascending: true });
    if (error) console.error('Error fetching events:', error);
    else setEvents(data);
  }

  const onScanSuccess = async (decodedText) => {
    if (selectedEvent) {
      if (scannerRef.current) {
        scannerRef.current.pause(true);
      }

      try {
        const { data: ticket, error } = await supabase
          .from('userevents')
          .select('*, events(event_name), users(first_name, last_name)')
          .eq('qr_code', decodedText)
          .single();

        if (error) throw error;

        if (ticket.event_id !== selectedEvent.id) {
          setScanResult({
            status: 'error',
            message: `This ticket is for event "${ticket.events.event_name}" and not valid for this event.`,
          });
        } else if (ticket.used) {
          setScanResult({ status: 'error', message: 'Ticket already used' });
        } else {
          const { error: updateError } = await supabase
            .from('userevents')
            .update({ used: true })
            .eq('id', ticket.id);

          if (updateError) throw updateError;

          setScanResult({
            status: 'success',
            message: `Valid ticket. Entry granted for ${ticket.users.first_name} ${ticket.users.last_name}.`,
          });
          await fetchAdmittedPeople();
          if (audioRef.current) {
            audioRef.current.play();
          }
        }
      } catch (error) {
        console.error('Error:', error);
        setScanResult({ status: 'error', message: 'Invalid ticket' });
      }
      setShowScanner(false);
    }
  };

  const onScanError = (error) => {
    console.warn(error);
  };

  async function fetchAdmittedPeople() {
    if (!selectedEvent) return;

    const { data, error } = await supabase
      .from('userevents')
      .select('*, users(first_name, last_name)')
      .eq('event_id', selectedEvent.id)
      .eq('used', true)
      .order('purchase_date', { ascending: false });

    if (error) console.error('Error fetching admitted people:', error);
    else setAdmittedPeople(data);
  }

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
      <h1 className="text-4xl font-bold mb-6 text-left text-white font-bebas-neue">
        Event Scanner
      </h1>

      <div className="mb-6 flex items-center">
        <IoCalendarOutline className="text-[#FF5252] mr-2" size={24} />
        <span className="text-2xl font-bold text-white font-bebas-neue">
          {format(selectedDate, 'MMMM d, yyyy')}
        </span>
      </div>

      <button
        className="mb-6 p-4 bg-[#333333] text-white rounded-lg w-full font-oswald text-xl"
        onClick={() => setShowCalendar(!showCalendar)}
      >
        {showCalendar ? 'Hide Calendar' : 'Change Date'}
      </button>

      {showCalendar && (
        <div className="mb-6">
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
        className="mb-6 p-4 border rounded-lg w-full text-white bg-[#333333] font-oswald text-xl"
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
          <div className="mb-6 text-left">
            <h2 className="text-3xl font-bold text-white font-bebas-neue">
              {selectedEvent.event_name}
            </h2>
            <div className="flex items-center text-[#B0B0B0] font-oswald text-xl mt-2">
              <IoLocationOutline className="text-[#FF5252]" size={24} />
              <span className="ml-2">{selectedEvent.location}</span>
            </div>
          </div>

          <button
            className="mb-6 p-4 bg-[#FF5252] text-white rounded-lg w-full font-oswald text-xl"
            onClick={handleScannerToggle}
          >
            {showScanner ? 'Hide Scanner' : 'Scan QR Code'}
          </button>

          {showScanner && (
            <div id="reader" className="mb-6 rounded-lg overflow-hidden"></div>
          )}

          {scanResult && (
            <div
              className={`mb-6 p-4 rounded-lg text-center ${
                scanResult.status === 'success' ? 'bg-green-700' : 'bg-red-700'
              } font-oswald flex items-center justify-center scan-result text-xl`}
            >
              {scanResult.status === 'success' ? (
                <FaCheckCircle size={24} className="mr-2" />
              ) : (
                <FaTimesCircle size={24} className="mr-2" />
              )}
              <span>{scanResult.message}</span>
            </div>
          )}

          <h2 className="text-2xl font-bold mb-4 text-white font-bebas-neue">
            Admitted People
          </h2>
          <ul className="divide-y divide-gray-700 font-oswald text-lg">
            {admittedPeople.map((ticket) => (
              <li key={ticket.id} className="py-3">
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
