# 🍞 PanMom — Sistema de Gestión para Negocio Familiar

PanMom es una aplicación web mobile-first desarrollada para digitalizar y organizar la operación diaria de un negocio familiar de pan.

El proyecto nació a partir de un problema real: pedidos anotados manualmente, múltiples personas gestionando información al mismo tiempo, cálculos hechos mentalmente y poca visibilidad sobre ventas, producción y caja diaria.

La idea principal fue transformar un flujo informal basado en cuadernos y WhatsApp en un sistema simple, rápido y pensado para usarse directamente desde el celular durante el trabajo diario.

---

# Objetivos del proyecto

* Centralizar pedidos en tiempo real
* Organizar producción diaria
* Reducir errores y desorden operativo
* Visualizar ventas y caja del día
* Simplificar el trabajo familiar
* Mantener una experiencia extremadamente simple y rápida

---

# Enfoque del sistema

La aplicación fue diseñada bajo una filosofía:

> “más rápida que usar un cuaderno”.

Por eso el sistema:

* evita configuraciones complejas
* prioriza inputs rápidos
* utiliza botones grandes
* está optimizado para iPhone y Android
* funciona en tiempo real entre múltiples dispositivos

---

# Funcionalidades principales

## Gestión de pedidos

* Registro rápido de pedidos
* Estado de pago
* Estados de producción y entrega
* Historial de pedidos

## Dashboard operativo

* Ventas del día
* Total de panes producidos
* Ingresos y caja
* Producción estimada
* Pedidos pendientes

## Sistema de producción

* Producción basada en “cargas”
* Cálculo automático de panes producidos
* Recetas reutilizables
* Costos aproximados automáticos

## Gestión de productos

* Pan corriente
* Pan de huevo
* Consomé
* Té
* Café

## Caja y movimientos

* Ingresos
* Gastos
* Retiros familiares
* Caja disponible

## Tiempo real

Todos los cambios se sincronizan instantáneamente entre dispositivos utilizando Supabase Realtime.

---

# Decisiones de diseño

Una de las decisiones más importantes fue modelar la producción usando el concepto de “cargas” en vez de unidades individuales.

Esto permitió:

* simplificar cálculos
* representar mejor el flujo real del negocio
* reducir fricción de uso
* facilitar control de producción

También se decidió separar:

* ventas
* producción
* costos
* movimientos de caja

para mantener claridad operativa sin convertir la aplicación en un sistema contable complejo.

---

# Stack tecnológico

Frontend:

* React
* Tailwind CSS
* Vite

Backend / Base de datos:

* Supabase
* PostgreSQL
* Supabase Realtime

Deploy:

* Vercel

---

# Objetivo a futuro

El proyecto está pensado para evolucionar hacia:

* pedidos realizados por clientes
* apertura/cierre de recepción de pedidos
* panel de clientes
* reportes avanzados
* análisis de ventas
* exportación de datos
* automatización operativa

---

# Aprendizajes del proyecto

Este proyecto no se enfocó únicamente en programación, sino también en:

* análisis de procesos reales
* UX para usuarios no técnicos
* modelado de operaciones
* digitalización de pequeños negocios
* diseño mobile-first
* automatización de flujos familiares

---

# Contexto

PanMom fue creado para resolver necesidades reales dentro de un negocio familiar, buscando mantener la simplicidad del trabajo cotidiano mientras se mejora el control operativo y la organización.
