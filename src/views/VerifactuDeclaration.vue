<template>
  <div>
    <title-bar :title-stack="titleStack" />
    <section class="section is-main-section">
      <h1 class="title is-4">
        <i class="fa-solid fa-file-invoice"></i>
        &nbsp;
      DECLARACIÓN RESPONSABLE DEL SISTEMA INFORMÁTICO DE FACTURACIÓN.
      </h1>

      <div class="doc-section">
        1.a) Nombre del sistema informático a que se refiere esta declaración responsable:
        <div class="doc-value">
          ESSTRAPIS
        </div>
      </div>

      <div class="doc-section">
        1.b) Código identificador del sistema informático a que se refiere el apartado a) de
        esta declaración responsable:
        <div class="doc-value">
          01
        </div>
      </div>

      <div class="doc-section">
        1.c) Identificador completo de la versión concreta del sistema informático a que se
        refiere esta declaración responsable:
        <div class="doc-value">
          2025.06.18.01
        </div>
        
      </div>

      <div class="doc-section">
        1.d) Componentes, hardware y software, de que consta el sistema informático a
        que se refiere esta declaración responsable, junto con una breve descripción de lo
        que hace dicho sistema informático y de sus principales funcionalidades:
      
      <div class="doc-value">
        Programa de código libre que permite facturar y gestionar las funciones para el envío de 
        información a la AEAT para cumplir con la normativa vigente en España VERI*FACTU.

        Se trata de una aplicación qeb que corre en un servidor web y que
        permite a los usuarios conectarse a través de un navegador web para realizar
        sus tareas de facturación y gestión de proyectos. Cada entidad que utilizada este software tiene su propia instáncia.
        Su código fuente consta de una parte frontend y una parte backend y se encuentra disponible en
        <a href="https://github.com/zarpilla/projectes" target="_blank">https://github.com/zarpilla/projectes</a> y en 
        <a href="https://github.com/zarpilla/projectes-front" target="_blank">https://github.com/zarpilla/projectes-front</a>.

        Este software permite gestionar de forma independiente varias facturaciones
        dentro de él, cumpliendo separadamente con la normativa mencionada en el
        apartado 1.k) de esta declaración responsable para cada una de ellas, como si,
        en la práctica, se tratara de sistemas informáticos de facturación distintos.
        </div>
        
      </div>

      <div class="doc-section">
        1.e) Indicación de si el sistema informático a que se refiere esta declaración
        responsable se ha producido de tal manera que, a los efectos de cumplir con el
        Reglamento, solo pueda funcionar exclusivamente como «VERI*FACTU»:
        <div class="doc-value">
        Sí
        </div>
      </div>

      <div class="doc-section">
        1.f) Indicación de si el sistema informático a que se refiere la declaración
        responsable permite ser usado por varios obligados tributarios o por un mismo
        usuario para dar soporte a la facturación de varios obligados tributarios:
        <div class="doc-value">
          Sí
        </div>
      </div>

      <div class="doc-section">
        1.g) Tipos de firma utilizados para firmar los registros de facturación y de evento en
        el caso de que el sistema informático a que se refiere esta declaración responsable
        no sea utilizado como «VERI*FACTU».
        <div class="doc-value">
          No procede, dado que el sistema informático a que se refiere esta
          declaración responsable se utiliza exclusivamente como «VERI*FACTU».
        </div>
      </div>

      <div class="doc-section">
        1.h) Razón social de la entidad productora del sistema informático a que se refiere
        esta declaración responsable:
        <div class="doc-value">
          ---
        </div>
      </div>

      <div class="doc-section">
        1.i) Número de identificación fiscal (NIF) español de la entidad productora del
        sistema informático a que se refiere esta declaración responsable:
        <div class="doc-value">
          ---
        </div>
      </div>

      <div class="doc-section">
        1.j) Dirección postal completa de contacto de la entidad productora del sistema
        informático a que se refiere esta declaración responsable:
        <div class="doc-value">
          ---
        </div>
      </div>

      <div class="doc-section">
        1.k) La entidad productora del sistema informático a que se refiere esta
        declaración responsable hace constar que dicho sistema informático, en la
        versión indicada en ella, cumple con lo dispuesto en el artículo 29.2.j) de la Ley
        58/2003, de 17 de diciembre, General Tributaria, en el Reglamento que
        establece los requisitos que deben adoptar los sistemas y programas
        informáticos o electrónicos que soporten los procesos de facturación de
        empresarios y profesionales, y la estandarización de formatos de los registros
        de facturación, aprobado por el Real Decreto 1007/2023, de 5 de diciembre, en
        la Orden HAC/1177/2024, de 17 de octubre, y en la sede electrónica de la
        Agencia Estatal de Administración Tributaria para todo aquello que complete
        las especificaciones de dicha orden.
      </div>

      <div class="doc-section">
        1.l)<br>- Fecha en que la entidad productora de este sistema informático suscribe esta
        declaración responsable del mismo:
        <div
          class="doc-value">
          18 de junio de 2025.
        </div>        
      </div>
      <div class="doc-section">
        - Lugar en que la entidad productora de este sistema informático suscribe esta
        declaración responsable del mismo:
        <div
          class="doc-value">
          ---
        </div>
      </div>
    </section>
  </div>
</template>

<script>
import TitleBar from "@/components/TitleBar";
import CardComponent from "@/components/CardComponent";
export default {
  name: "ChangeLog",
  components: {
    CardComponent,
    TitleBar
  },
  computed: {
    titleStack() {
      return ["Registre de canvis"];
    }
  }
};
</script>
<style scoped>
ul {
  list-style: disc;
  margin-left: 0.5rem;
}
.doc-section{
  font-weight: bold;
  margin-bottom: 1rem;
}
.doc-value{
  font-weight: normal;
  display: inline-block;
  width: 100%;
}
</style>
