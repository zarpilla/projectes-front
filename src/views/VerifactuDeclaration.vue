<template>
  <div>
    <title-bar :title-stack="titleStack" />

    <section class="section is-main-section" v-if="verifactu && verifactu.id">
      <div id="pdf">
        <h1 class="title is-4">
          <i class="fa-solid fa-file-invoice"></i>
          &nbsp; DECLARACIÓN RESPONSABLE DEL SISTEMA INFORMÁTICO DE FACTURACIÓN
        </h1>

        <div class="doc-section">
          1.a) Nombre del sistema informático a que se refiere esta declaración
          responsable:
          <div class="doc-value">
            {{ verifactu.software_name }}
          </div>
        </div>

        <div class="doc-section">
          1.b) Código identificador del sistema informático a que se refiere el
          apartado a) de esta declaración responsable:
          <div class="doc-value">
            {{ verifactu.software_id }}
          </div>
        </div>

        <div class="doc-section">
          1.c) Identificador completo de la versión concreta del sistema
          informático a que se refiere esta declaración responsable:
          <div class="doc-value">
            {{ verifactu.software_version }}
          </div>
        </div>

        <div class="doc-section">
          1.d) Componentes, hardware y software, de que consta el sistema
          informático a que se refiere esta declaración responsable, junto con
          una breve descripción de lo que hace dicho sistema informático y de
          sus principales funcionalidades:

          <div class="doc-value">
            {{ verifactu.software_name }} es un programa de código libre que
            permite facturar y gestionar las funciones para el envío de
            información a la AEAT para cumplir con la normativa vigente en
            España VERI*FACTU. Se trata de una aplicación web que corre en un
            servidor web y que permite a los usuarios conectarse a través de un
            navegador web para realizar sus tareas de facturación y gestión de
            proyectos. Cada entidad que utilizada este software tiene su propia
            instáncia. Su código fuente consta de tres partes, una parte
            frontend, una parte backend y una biblioteca de generación de XML
            para Verifactu. Su código, se encuentra disponible en
            <a href="https://github.com/zarpilla/projectes" target="_blank"
              >https://github.com/zarpilla/projectes</a
            >
            , en
            <a
              href="https://github.com/zarpilla/projectes-front"
              target="_blank"
              >https://github.com/zarpilla/projectes-front</a
            >
            y en
            <a
              href="https://github.com/zarpilla/verifactu-node-lib"
              target="_blank"
              >https://github.com/zarpilla/verifactu-node-lib</a
            >
            . Cada instancia de este software permite gestionar de forma
            independiente la facturación dentro de él, cumpliendo separadamente
            con la normativa mencionada en el apartado 1.k) de esta declaración
            responsable para cada una de ellas, como si, en la práctica, se
            tratara de sistemas informáticos de facturación distintos.
          </div>
        </div>

        <div class="doc-section">
          1.e) Indicación de si el sistema informático a que se refiere esta
          declaración responsable se ha producido de tal manera que, a los
          efectos de cumplir con el Reglamento, solo pueda funcionar
          exclusivamente como «VERI*FACTU»:
          <div class="doc-value">
            Sí
          </div>
        </div>

        <div class="doc-section">
          1.f) Indicación de si el sistema informático a que se refiere la
          declaración responsable permite ser usado por varios obligados
          tributarios o por un mismo usuario para dar soporte a la facturación
          de varios obligados tributarios:
          <div class="doc-value">
            Sí
          </div>
        </div>

        <div class="doc-section">
          1.g) Tipos de firma utilizados para firmar los registros de
          facturación y de evento en el caso de que el sistema informático a que
          se refiere esta declaración responsable no sea utilizado como
          «VERI*FACTU».
          <div class="doc-value">
            No procede, dado que el sistema informático a que se refiere esta
            declaración responsable se utiliza exclusivamente como «VERI*FACTU».
          </div>
        </div>

        <div class="doc-section">
          1.h) Razón social de la entidad productora del sistema informático a
          que se refiere esta declaración responsable:
          <div class="doc-value">
            {{ verifactu.software_developerName }}
          </div>
        </div>

        <div class="doc-section">
          1.i) Número de identificación fiscal (NIF) español de la entidad
          productora del sistema informático a que se refiere esta declaración
          responsable:
          <div class="doc-value">
            {{ verifactu.software_developerIrsId }}
          </div>
        </div>

        <div class="doc-section">
          1.j) Dirección postal completa de contacto de la entidad productora
          del sistema informático a que se refiere esta declaración responsable:
          <div class="doc-value">
            {{ verifactu.software_address }}
          </div>
        </div>

        <div class="doc-section">
          1.k) La entidad productora del sistema informático a que se refiere
          esta declaración responsable hace constar que dicho sistema
          informático, en la versión indicada en ella, cumple con lo dispuesto
          en el artículo 29.2.j) de la Ley 58/2003, de 17 de diciembre, General
          Tributaria, en el Reglamento que establece los requisitos que deben
          adoptar los sistemas y programas informáticos o electrónicos que
          soporten los procesos de facturación de empresarios y profesionales, y
          la estandarización de formatos de los registros de facturación,
          aprobado por el Real Decreto 1007/2023, de 5 de diciembre, en la Orden
          HAC/1177/2024, de 17 de octubre, y en la sede electrónica de la
          Agencia Estatal de Administración Tributaria para todo aquello que
          complete las especificaciones de dicha orden.
        </div>

        <div class="doc-section">
          1.l)<br />- Fecha en que la entidad productora de este sistema
          informático suscribe esta declaración responsable del mismo:
          <div class="doc-value">
            {{ verifactu.software_date }}
          </div>
        </div>
        <div class="doc-section">
          - Lugar en que la entidad productora de este sistema informático
          suscribe esta declaración responsable del mismo:
          <div class="doc-value">
            {{ verifactu.software_location }}
          </div>
        </div>

        <div
          class="doc-section"
          style="border:1px solid #aaa; padding:1rem; background:#f9f9f9; margin-top:2rem;"
        >
          <strong
            >Anexo: Software de Código Abierto y Cumplimiento Normativo</strong
          >
          <div class="doc-value" style="margin-top:0.5rem;">
            Este software se distribuye bajo licencia <b>GPLv3</b> como código
            abierto (<i>Open Source</i>). Cualquier modificación, alteración o
            redistribución del código sin la debida autorización del autor puede
            suponer el incumplimiento de la licencia GPLv3 y, además, podría
            hacer que el sistema deje de cumplir con la normativa VERI*FACTU y
            la legislación vigente. Se recomienda que cualquier cambio sea
            revisado y validado por los responsables del proyecto para
            garantizar el cumplimiento legal y técnico.
          </div>
        </div>
      </div>

      <div class="doc-section mt-4">
        <b-table :data="verifactuDeclarations" striped>
          <b-table-column label="Versió" field="version" v-slot="props">
            {{ props.row.version }}
          </b-table-column>
          <b-table-column label="PDF" field="url" v-slot="props">
            <a
              :href="props.row.url"
              target="_blank"
              class="zbutton is-primary is-outlined"
            >
              Veure PDF
            </a>
          </b-table-column>
        </b-table>
      </div>

      <b-button
        class="button is-primary is-outlined"
        @click="getVerifactuPDF"
        v-if="verifactu && verifactu.id"
        >PDF</b-button
      >
    </section>
  </div>
</template>

<script>
import TitleBar from "@/components/TitleBar";
import CardComponent from "@/components/CardComponent";
import service from "@/service/index";
import html2pdf from "html2pdf.js";
export default {
  name: "ChangeLog",
  components: {
    CardComponent,
    TitleBar
  },
  data() {
    return {
      verifactu: {},
      verifactuDeclarations: []
    };
  },
  computed: {
    titleStack() {
      return [
        "Verifactu",
        "Declaració responsable del sistema informàtic de facturació"
      ];
    }
  },
  async created() {
    await this.getData();
  },
  methods: {
    async getData() {
      const verifactu = await service({ requiresAuth: true, cached: true }).get(
        "verifactu"
      );
      this.verifactu = verifactu.data;

      const verifactuDeclarations = await service({
        requiresAuth: true,
        cached: true
      }).get("verifactu-declarations");
      this.verifactuDeclarations = verifactuDeclarations.data;
    },
    async getVerifactuPDF() {
      var element = document.getElementById("pdf");
      var opt = {
        margin: [0, 0],
        filename: `DECLARACIÓN_RESPONSABLE_DEL_SISTEMA_INFORMÁTICO_DE_FACTURACIÓN_${this.verifactu.software_version}.pdf`,
        image: { type: "jpeg", quality: 1 },
        html2canvas: { dpi: 300, scale: 4, letterRendering: true },
        jsPDF: { unit: "pt", format: "letter", orientation: "portrait" },
        pagebreak: { mode: ["avoid-all", "css", "legacy"] }
      };

      html2pdf()
        .from(element)
        .set(opt)
        .toPdf()
        .get("pdf")
        .then(function(pdfObject) {})
        .save();
    }
  }
};
</script>
<style scoped>
ul {
  list-style: disc;
  margin-left: 0.5rem;
}
.doc-section {
  font-weight: bold;
  margin-bottom: 1rem;
}
.doc-value {
  font-weight: normal;
  display: inline-block;
  width: 100%;
}
#pdf {
  background: #fff;
  padding: 2rem;
  margin-bottom: 2rem;
  font-size: 10px;
}
#pdf h1 {
  font-size: 14px;
  margin-bottom: 1rem;
}
</style>
