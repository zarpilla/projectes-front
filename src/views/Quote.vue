<template>
  <div>
    <title-bar :title-stack='titleStack' />
    <hero-bar>
      {{ heroTitle }}
    </hero-bar>
    <section class='section is-main-section'>
      <div class="columns">
        <div class="column">
          <div class='invoice-box-container' >
            <div id="quote" class='invoice-box' v-if="me && quote">
              <table cellpadding='0' cellspacing='0'>
                <tr class='top'>
                  <td :colspan="5">
                    <table class="header-table">
                      <tr>
                        <td class='title'>
                          <img
                            :src="imageUrl"
                            style='width: 100%; max-width: 200px'
                          />
                        </td>

                        <td  class='more'>
                          <span v-if="quote.proforma">{{ texts[locale]['Factura proforma'] }}</span>
                          <span v-else>{{ texts[locale]['Pressupost'] }} </span>
                          {{ quote.code }}<br />
                          {{ texts[locale]['Data:'] }} {{ quote.date ? quote.date : quote.updated_at | formatDMYDate }}<br />
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <tr class='information'>
                  <td :colspan="5">
                    <table>
                      <tr>
                        <td class="prov-td">
                          <div class="client">{{ texts[locale]['PROVEÏDOR'] }}</div>
                          <div v-if="me.name">{{ me.name }}</div>
                          <div v-if="me.nif">{{ me.nif }}</div>
                          <div v-if="me.address">{{ me.address }}<br />{{ me.postcode }} {{ me.city }} {{ me.state ? `(${me.state})` : ''}}</div>
                          <div v-if="me.phone">{{ me.phone }}</div>
                          <div v-if="me.email">{{ me.email }}</div>
                        </td>
                        <td class="client-td" v-if="quote.contact && quote.contact.id">
                          <div class="client">{{ texts[locale]['CLIENT'] }}</div>
                          <div v-if="quote.contact.name">{{ quote.contact.name }}</div>
                          <div v-if="quote.contact.nif">{{ quote.contact.nif }}</div>                          
                          <div v-if="quote.contact.address">{{ quote.contact.address }}<br />{{ quote.contact.postcode }} {{ quote.contact.city }}</div>
                          <div v-if="quote.contact.phone">{{ quote.contact.phone }}</div>
                          <!-- <div v-if="quote.contact.email">{{ quote.contact.email }}</div> -->
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr class="zt-heading">
                  <td :colspan="5">
                    <table>
                      <tr class="t-heading">
                        <td>{{ texts[locale]['Concepte'] }}</td>
                        <td v-if="showQuantity">{{ texts[locale]['Q.'] }}</td>
                        <td v-if="showQuantity || showVat">{{ texts[locale]['Preu'] }}</td>
                        <td v-if="showVat">{{ texts[locale]['IVA'] }}</td>
                        <td>{{ texts[locale]['Total'] }}</td>
                      </tr>
                      <tr class="item" v-for="(line, i) in quote.lines" v-bind:key="line.id" :class="{ last: i == line.length}">
                        <td>{{ line.concept }}
                          <div v-if="line.comments" class="comments">
                            <span v-html="line.comments.replace(/(?:\r\n|\r|\n)/g, '<br>')"></span>
                          </div>
                        </td>
                        <td v-if="showQuantity">{{ line.quantity }}</td>
                        <td v-if="showQuantity || showVat">{{ line.base }}€</td>
                        <td v-if="showVat">{{ line.quantity * line.base * line.vat / 100 | formatCurrency }}€ ({{ line.vat }}%)</td>
                        <td>{{ line.quantity * line.base * (1+ line.vat / 100) | formatCurrency }}€</td>
                      </tr>
                      <tr class="total">
                        <td :colspan="6">
                          <div class="zmt-3" v-if="showVat">{{ texts[locale]['Total (sense IVA):'] }} {{ quote.total_base | formatCurrency }}€</div>
                          <div v-if="showVat">{{ texts[locale]['IVA'] }}: {{ quote.total_vat | formatCurrency}}€</div>
                          <div class="mt-3">
                          {{ texts[locale]['Total'] }}: {{ quote.total | formatCurrency}}€
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              <div v-if="quote.comments" class="comments global-comments">
                <div class="more notes">Notes</div>
                <div class="notes-content" v-html="quote.comments"></div>
              </div>
              <div v-if="me.quote_footer" class="comments global-comments quote-footer">
                <span v-html="me.quote_footer.replace(/(?:\r\n|\r|\n)/g, '<br>')"></span>
              </div>
            </div>
          </div>
        </div>
        <div class="column">
          <button class="button is-primary" @click="getPDF">
            Descarrega PDF
          </button>
        </div>
      </div>
    </section>
  </div>
</template>

<script>
// import axios from 'axios'
// import dayjs from 'dayjs'
// import find from 'lodash/find'
import TitleBar from '@/components/TitleBar'
import HeroBar from '@/components/HeroBar'
import service from '@/service/index'
import moment from 'moment'
import html2pdf from 'html2pdf.js'

export default {
  name: 'ClientForm',
  components: {
    TitleBar,
    HeroBar
  },
  props: {
    id: {
      type: [String, Number],
      default: null
    }
  },
  data () {
    return {
      isLoading: false,
      quote: null,
      me: null,
      baseUrl: process.env.VUE_APP_API_URL || 'http://localhost:1337',
      imageUrl: null,
      locale: 'ca',
      texts: {
        ca: {
          'Factura proforma': 'Factura proforma',
          'Pressupost': 'Pressupost',
          'Data:': 'Data:',
          'PROVEÏDOR': 'PROVEÏDOR',
          'CLIENT': 'CLIENT',
          'Concepte': 'Concepte',
          'Q.': 'Q.',
          'Preu': 'Preu',
          'IVA': 'IVA',
          'Total': 'Total',
          'Total:': 'Total:',
          'Notes': 'Notes',
          'Total (sense IVA):': 'Total (sense IVA):'
        },
        es: {
          'Factura proforma': 'Factura proforma',
          'Pressupost': 'Presupuesto',
          'Data:': 'Fecha:',
          'PROVEÏDOR': 'PROVEEDOR',
          'CLIENT': 'CLIENTE',
          'Concepte': 'Concepto',
          'Q.': 'Cant.',
          'Preu': 'Precio',
          'IVA': 'IVA',
          'Total': 'Total',
          'Total:': 'Total:',
          'Notes': 'Notas',
          'Total (sense IVA):': 'Total (sin IVA):'
        },
        en: {
          'Factura proforma': 'Proforma invoice',
          'Pressupost': 'Budget',
          'Data:': 'Date:',
          'PROVEÏDOR': 'PROVIDER',
          'CLIENT': 'CLIENT',
          'Concepte': 'Concept',
          'Q.': 'Q.',
          'Preu': 'Price',
          'IVA': 'VAT',
          'Total': 'Total',
          'Total:': 'Total:',
          'Notes': 'Notes',
          'Total (sense IVA):': 'Total (without VAT):'
        }
      }
    }
  },
  computed: {
    titleStack () {
      return ['Facturació', 'Pressupost']
    },
    heroTitle () {
      return this.quote ? this.quote.code : ''
    },
    showQuantity () {
      return this.quote.lines.find(l => l.quantity > 1) !== undefined
    },
    showVat () {
      return this.quote.lines.find(l => l.vat > 0) !== undefined
    },
    columnsShown () {
      return this.showQuantity && this.showVat ? 5 : (this.showQuantity ? 3 : 4)
    }
  },
  created () {
    this.getData()
    if (this.$route.query.locale) {
      this.locale = this.$route.query.locale
    }
  },
  methods: {
    getData () {
      if (this.$route.params.id) {
        service({ requiresAuth: true })
          .get(`quotes/${this.$route.params.id}`)
          .then((r) => {
            console.log('quote', r.data)
            this.quote = r.data
          })
        service({ requiresAuth: true, cached: true })
          .get('me')
          .then((r) => {
            console.log('me', r.data)
            this.me = r.data
            const img = `${this.baseUrl}${this.me.logo.url}`
            this.toDataUrl(img, (base64) => {
              this.imageUrl = base64
            })
          })
      }
    },
    async getPDF () {
      var element = document.getElementById('quote')
      var opt = {
        margin: [0, 0],
        filename: `pressupost-${this.quote.contact.name}-${this.quote.code}`,
        // image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { dpi: 300, letterRendering: false, scale: 2 },
        jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
      }
      const pdf = html2pdf().set(opt).from(element)
      // await pdf.save(opt.filename, { returnPromise: true })

      pdf.toPdf().get('pdf').then(function (pdf) {
         window.open(
          pdf.output('bloburl', "lala.pdf")
          , "lala.pdf");
      });

      // window.open( pdf.save(opt.filename) , '_blank');

      // html2pdf().set(opt).from(element).toPdf().get('pdf').then(function (pdf) {        
      // });
    },
    toDataUrl (url, callback) {
      var xhr = new XMLHttpRequest()
      xhr.onload = function () {
        var reader = new FileReader()
        reader.onloadend = function () {
          callback(reader.result)
        }
        reader.readAsDataURL(xhr.response)
      }
      xhr.open('GET', url)
      xhr.responseType = 'blob'
      xhr.send()
    }
  },
  filters: {
    formatDMYDate (val) {
      if (!val) { return '-' }
      return moment(val).format('DD/MM/YYYY')
    },
    formatCurrency (val) {
      if (!val) { return '-' }
      return val.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&;').replace(/\./g, ',').replace(/;/g, '.')
    }
  }
}
</script>
<style scoped>
.invoice-box-container{
box-shadow: 0 0 10px rgba(0, 0, 0, 0.15);
border: 1px solid #eee;
}
.invoice-box {
  max-width: 800px;
  margin: auto;
  padding: 30px;
  font-size: 12px;
  line-height: 24px;
  font-family: sans-serif, 'Helvetica Neue', 'Helvetica', Helvetica, Arial, sans-serif;
  color: #222;
  background: #fff;
}

.invoice-box table {
  width: 100%;
  line-height: inherit;
  text-align: left;
}

.invoice-box table td {
  padding: 5px;
  vertical-align: top;
}

.invoice-box table tr td:nth-child(2) {
  text-align: right;
}
.invoice-box table tr td:nth-child(3) {
  text-align: right;
}
.invoice-box table tr td:nth-child(4) {
  text-align: right;
}
.invoice-box table tr td:nth-child(5) {
  text-align: right;
}
.invoice-box table tr.top table td {
  padding-bottom: 20px;
}

.invoice-box table tr.top table td.title {
  font-size: 45px;
  line-height: 45px;
  color: #222;
}

.invoice-box table tr.information table td {
  padding-bottom: 40px;
}

.invoice-box table tr.t-heading td {
  border-bottom: 1px solid #ddd;
  border-bottom:3px solid #f9a43b;
  font-weight: bold;
}

.invoice-box table tr.details td {
  padding-bottom: 20px;
}

.invoice-box table tr.item td {
  border-bottom: 2px solid #f9a43b;
}

.invoice-box table tr.item.last td {
  border-bottom: none;
}

.invoice-box table tr.total {
  margin-top: 1rem;
}
.invoice-box table tr.total td{
  text-align: right;
  font-weight: bold;
  color:#222;
}
.invoice-box table tr.total td:nth-child(2) {
  border-top: 1px solid #f9a43b;
  font-weight: bold;
  color:#222;
}

.invoice-box .notes{
  padding: 5px;
}
.invoice-box .notes-content {
  padding: 5px
}
.invoice-box .global-comments{
  margin-top: 4rem;
}
.invoice-box .client{
  color:#222;
  font-weight: bold
}
.invoice-box .more{
  color:#222;
  font-weight: bold;
}
.invoice-box .header-table {
  border-bottom:3px solid #f9a43b;
  margin-bottom: 1rem;
}
.invoice-box .notes{
  border-bottom:3px solid #f9a43b;
  margin-bottom: 0.5rem;
}

.invoice-box .quote-footer{
  border-top:1px solid #f9a43b;
  margin-top: 5rem;
  padding-top: 0.5rem;
  font-size:13px
}

.invoice-box .prov-td, .invoice-box .client-td {
  width:50%
}
@media only screen and (max-width: 600px) {
  .invoice-box table tr.top table td {
    width: 100%;
    display: block;
    text-align: center;
  }

  .invoice-box table tr.information table td {
    width: 100%;
    display: block;
    text-align: center;
  }
}

/** RTL **/
.rtl {
  direction: rtl;
  font-family: Tahoma, 'Helvetica Neue', 'Helvetica', Helvetica, Arial,
    sans-serif;
}

.rtl table {
  text-align: right;
}

.rtl table tr td:nth-child(2) {
  text-align: left;
}
</style>
