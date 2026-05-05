import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface Service {
  id: string;
  name: string;
  description: string;
  duration: number; // in minutes
  price: number;
  active: boolean;
  order: number;
}

export interface TimeBlock {
  id: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  type: 'available' | 'blocked';
}

export interface Appointment {
  id: string;
  serviceId: string;
  clientName: string;
  clientPhone: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  status: 'confirmada' | 'pendiente' | 'cancelada';
  createdAt: string;
}

export interface BusinessProfile {
  name: string;
  slogan: string;
  city: string;
  neighborhood: string;
  phone: string;
  instagram: string;
  logo?: string;
  photos: { id: string; url: string; featured: boolean }[];
}

export interface Settings {
  allowSameDayBooking: boolean;
  minimumAdvanceHours: number;
  workingHoursStart: string; // HH:mm
  workingHoursEnd: string; // HH:mm
  blockMultipleBookingsPerPhone: boolean;
}

interface AppContextType {
  services: Service[];
  setServices: (services: Service[]) => void;
  appointments: Appointment[];
  setAppointments: (appointments: Appointment[]) => void;
  timeBlocks: TimeBlock[];
  setTimeBlocks: (blocks: TimeBlock[]) => void;
  businessProfile: BusinessProfile;
  setBusinessProfile: (profile: BusinessProfile) => void;
  settings: Settings;
  setSettings: (settings: Settings) => void;
  isAuthenticated: boolean;
  setIsAuthenticated: (auth: boolean) => void;
  addAppointment: (appointment: Omit<Appointment, 'id' | 'createdAt'>) => void;
  updateAppointment: (id: string, updates: Partial<Appointment>) => void;
  deleteAppointment: (id: string) => void;
  addService: (service: Omit<Service, 'id'>) => void;
  updateService: (id: string, updates: Partial<Service>) => void;
  deleteService: (id: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Mock data
const mockServices: Service[] = [
  {
    id: '1',
    name: 'Manicure Básico',
    description: 'Limado, pulido y esmaltado de uñas',
    duration: 45,
    price: 250,
    active: true,
    order: 1,
  },
  {
    id: '2',
    name: 'Manicure Semipermanente',
    description: 'Manicure con esmalte semipermanente de larga duración',
    duration: 90,
    price: 450,
    active: true,
    order: 2,
  },
  {
    id: '3',
    name: 'Uñas Acrílicas',
    description: 'Extensión y diseño de uñas acrílicas',
    duration: 120,
    price: 650,
    active: true,
    order: 3,
  },
  {
    id: '4',
    name: 'Pedicure Spa',
    description: 'Pedicure completo con exfoliación y masaje',
    duration: 60,
    price: 350,
    active: true,
    order: 4,
  },
  {
    id: '5',
    name: 'Diseño de Uñas',
    description: 'Arte y diseño personalizado en tus uñas',
    duration: 30,
    price: 200,
    active: true,
    order: 5,
  },
];

const mockAppointments: Appointment[] = [
  {
    id: '1',
    serviceId: '2',
    clientName: 'María González',
    clientPhone: '5512345678',
    date: '2026-05-05',
    startTime: '10:00',
    status: 'confirmada',
    createdAt: '2026-05-01T10:00:00Z',
  },
  {
    id: '2',
    serviceId: '1',
    clientName: 'Ana Martínez',
    clientPhone: '5587654321',
    date: '2026-05-05',
    startTime: '14:00',
    status: 'confirmada',
    createdAt: '2026-05-02T14:30:00Z',
  },
  {
    id: '3',
    serviceId: '3',
    clientName: 'Lucía Fernández',
    clientPhone: '5523456789',
    date: '2026-05-06',
    startTime: '11:00',
    status: 'confirmada',
    createdAt: '2026-05-02T16:00:00Z',
  },
  {
    id: '4',
    serviceId: '4',
    clientName: 'Carmen López',
    clientPhone: '5534567890',
    date: '2026-05-06',
    startTime: '16:00',
    status: 'pendiente',
    createdAt: '2026-05-03T09:00:00Z',
  },
  {
    id: '5',
    serviceId: '2',
    clientName: 'Isabel Rodríguez',
    clientPhone: '5545678901',
    date: '2026-05-07',
    startTime: '10:00',
    status: 'confirmada',
    createdAt: '2026-05-03T11:00:00Z',
  },
];

const mockTimeBlocks: TimeBlock[] = [
  // May 5, 2026 - Monday
  { id: 'tb1', date: '2026-05-05', startTime: '09:00', endTime: '18:00', type: 'available' },
  // May 6, 2026 - Tuesday
  { id: 'tb2', date: '2026-05-06', startTime: '09:00', endTime: '18:00', type: 'available' },
  // May 7, 2026 - Wednesday
  { id: 'tb3', date: '2026-05-07', startTime: '09:00', endTime: '18:00', type: 'available' },
  // May 8, 2026 - Thursday
  { id: 'tb4', date: '2026-05-08', startTime: '09:00', endTime: '18:00', type: 'available' },
  // May 9, 2026 - Friday
  { id: 'tb5', date: '2026-05-09', startTime: '09:00', endTime: '18:00', type: 'available' },
  // May 12, 2026 - Monday
  { id: 'tb6', date: '2026-05-12', startTime: '09:00', endTime: '18:00', type: 'available' },
  // May 13, 2026 - Tuesday
  { id: 'tb7', date: '2026-05-13', startTime: '09:00', endTime: '18:00', type: 'available' },
];

const mockBusinessProfile: BusinessProfile = {
  name: 'Lumenly',
  slogan: 'Tu belleza es nuestra pasión. Especialistas en uñas y cuidado personal.',
  city: 'Ciudad de México',
  neighborhood: 'Polanco',
  phone: '5555551234',
  instagram: '@bellezayestilo',
  photos: [],
};

const mockSettings: Settings = {
  allowSameDayBooking: false,
  minimumAdvanceHours: 2,
  workingHoursStart: '09:00',
  workingHoursEnd: '18:00',
  blockMultipleBookingsPerPhone: true,
};

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [services, setServices] = useState<Service[]>(mockServices);
  const [appointments, setAppointments] = useState<Appointment[]>(mockAppointments);
  const [timeBlocks, setTimeBlocks] = useState<TimeBlock[]>(mockTimeBlocks);
  const [businessProfile, setBusinessProfile] = useState<BusinessProfile>(mockBusinessProfile);
  const [settings, setSettings] = useState<Settings>(mockSettings);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const addAppointment = (appointment: Omit<Appointment, 'id' | 'createdAt'>) => {
    const newAppointment: Appointment = {
      ...appointment,
      id: Math.random().toString(36).substring(7),
      createdAt: new Date().toISOString(),
    };
    setAppointments([...appointments, newAppointment]);
  };

  const updateAppointment = (id: string, updates: Partial<Appointment>) => {
    setAppointments(appointments.map(apt => (apt.id === id ? { ...apt, ...updates } : apt)));
  };

  const deleteAppointment = (id: string) => {
    setAppointments(appointments.filter(apt => apt.id !== id));
  };

  const addService = (service: Omit<Service, 'id'>) => {
    const newService: Service = {
      ...service,
      id: Math.random().toString(36).substring(7),
    };
    setServices([...services, newService]);
  };

  const updateService = (id: string, updates: Partial<Service>) => {
    setServices(services.map(svc => (svc.id === id ? { ...svc, ...updates } : svc)));
  };

  const deleteService = (id: string) => {
    setServices(services.filter(svc => svc.id !== id));
  };

  return (
    <AppContext.Provider
      value={{
        services,
        setServices,
        appointments,
        setAppointments,
        timeBlocks,
        setTimeBlocks,
        businessProfile,
        setBusinessProfile,
        settings,
        setSettings,
        isAuthenticated,
        setIsAuthenticated,
        addAppointment,
        updateAppointment,
        deleteAppointment,
        addService,
        updateService,
        deleteService,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
};
