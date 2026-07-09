/**
 * domains.js — los 8 dominios de negocio (arquitectura congelada).
 * La navegación se organiza por disciplina de negocio, no por dataset ni por modo.
 */
import { HeartPulse, TrendingUp, Users, Megaphone, Zap, Layers, Package, Wrench } from "lucide-react";

export const DOMAINS = [
  { id: "salud",           label: "Salud del Negocio", icon: HeartPulse,
    objetivo: "Estado del negocio de un vistazo y detección de desviaciones." },
  { id: "revenue",         label: "Revenue",           icon: TrendingUp,
    objetivo: "Entender y hacer crecer los ingresos; saber de dónde viene cada euro." },
  { id: "clientes",        label: "Clientes",          icon: Users,
    objetivo: "La economía del comprador: captar vs. fidelizar." },
  { id: "marketing",       label: "Marketing",         icon: Megaphone,
    objetivo: "Que cada canal y campaña rinda al máximo sin dañar la lista." },
  { id: "automatizaciones",label: "Automatizaciones",  icon: Zap,
    objetivo: "Flujos automáticos que generan revenue recurrente sin degradarse." },
  { id: "crm",             label: "CRM",               icon: Layers,
    objetivo: "Dirigir el marketing a la audiencia correcta y mantener la base sana." },
  { id: "producto",        label: "Producto",          icon: Package,
    objetivo: "Crecer la marca propia y entender qué se vende." },
  { id: "operaciones",     label: "Operaciones",       icon: Wrench,
    objetivo: "Que la maquinaria de envío funcione sin roturas." },
];
