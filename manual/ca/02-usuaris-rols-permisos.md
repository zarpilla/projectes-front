---
title: "Usuaris, rols i permisos"
description: "Què permet cada permís i com es donen d'alta i es gestionen les usuàries."
product: esstrapis
manual: usuari
module: introduccio
order: 2
roles: [admin]
routes: ["/administracio/users"]
lang: ca
updated: 2026-10-18
---
# 02. Usuaris, rols i permisos

> Permís necessari: `admin`

Cada persona que entra a ESSTRAPIS té un compte d'**usuària** amb uns **permisos**, que decideixen què veu al
menú i què pot fer. Les usuàries són també les **persones** de l'equip: les que imputen hores, coordinen
projectes i cobren bestretes. Es gestionen a **Administració › Usuàries**.

## Els permisos

| Permís | Què permet |
|---|---|
| **Projectes** (`projects`) | Projectes, contactes, ingressos i despeses, tresoreria i informes. És el permís de qui gestiona. |
| **Hores** (`hours`) | Hores dedicades i registre de jornades propis. |
| **Logística** (`orders`) | Comandes, dipòsits, factures i punts d'entrega (per a les entitats amb logística). |
| **Logística (Admin)** (`orders_admin`) | Gestiona totes les comandes, rutes, incidències i el descompte multientrega. |
| **Logística (Repartidores)** (`orders_delivery`) | Veu les entregues que ha de fer. |
| **Admin** (`admin`) | El bloc **Administració**: configuració, usuàries, Verifactu i FACe, taules auxiliars. |

Els permisos es combinen: una persona sòcia que gestiona projectes i imputa hores té **Projectes** i **Hores**.
A cada capítol d'aquest manual, a dalt, s'indica el permís que cal.

Per exemple, una persona amb només **Hores** veu un menú molt més curt: les seves hores, el registre de
jornada i l'informe de dedicació.

![El menú d'una persona amb només el permís d'hores](img/02-usuaris-rols-permisos/04-menu-hores.png)

## La llista d'usuàries

![La llista d'usuàries](img/02-usuaris-rols-permisos/01-usuaries.png)

- **Cerca per nom o correu**, els botons **Tots**, **Visibles**, **Ocults** i **Bloquejats**, i el filtre per
  **Permís**.
- Cada fila mostra la persona, els seus permisos i l'**Estat** (**Actiu**, **Sense confirmar**, **Bloquejat**,
  **Ocult**). El llapis obre la fitxa.
- **Exporta** i **Nova usuària**.

## La fitxa d'una usuària

![La fitxa d'una usuària](img/02-usuaris-rols-permisos/02-usuaria.png)

- **Dades**: **Nom d'usuari** *, **Correu electrònic** * (amb el que entra), **Nom complet** (el que surt als
  informes, al registre de jornada i a les nòmines), **DNI/NIE** i **NAF** (número d'afiliació a la Seguretat
  Social, per al registre de jornada).
- **Permisos**: les caselles de la taula d'abans. El **Rol** és tècnic i gairebé sempre és *Authenticated*.
- **Logística**: **Descompte multientrega** (només a les entitats amb logística).
- **Accés**:
  - **Confirmat**: ha confirmat el seu correu.
  - **Bloquejat**: no pot entrar a l'aplicació; les seves dades es conserven.
  - **Ocult**: no surt a les llistes de persones (informes, jornades, dedicació, **Coordina**). Per a qui ja no
    treballa a l'entitat.
- **Clau de pas**: per posar-li'n una de nova (mínim 6 caràcters). En blanc, no es canvia.
- **Jornada i cost/hora**: els seus períodes de jornada, que s'editen a **Persones** (vegeu
  [15](15-persones-jornades.md)).

![El bloc Accés](img/02-usuaris-rols-permisos/03-usuaria-acces.png)

Després, **Guardar**.

## Pas a pas: donar d'alta una persona nova

1. **Nova usuària**: nom d'usuari, correu, nom complet i permisos. **Guardar**.
2. A **Persones**, definir-li la jornada i el salari (vegeu [15](15-persones-jornades.md)).
3. La persona entra amb el seu correu i, si no té clau, fa **He oblidat la clau** per triar-ne una.

## Quan una persona marxa

No s'esborra (les seves hores i nòmines han de quedar): es marca **Bloquejat** perquè no pugui entrar i **Ocult**
perquè no surti a les llistes, i es tanca el seu període de jornada a **Persones**.

## Vegeu també

- [01. Primers passos](01-primers-passos.md)
- [15. Persones i jornades laborals](15-persones-jornades.md)
