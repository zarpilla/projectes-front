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
                          Factura {{ quote.code }}<br />
                          Data: {{ quote.emitted ? quote.emitted : quote.updated_at | formatDMYDate }}<br />
                          <span v-if="quote.paybefore">Venciment: {{ quote.paybefore | formatDMYDate }}</span><br />
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <tr class='information'>
                  <td :colspan="5">
                    <table>
                      <tr>
                        <td>
                          <div class="client">PROVEÏDOR</div>
                          <div v-if="me.name">{{ me.name }}</div>
                          <div v-if="me.nif">{{ me.nif }}</div>
                          <div v-if="me.address">{{ me.address }}<br />{{ me.postcode }} {{ me.city }}</div>
                          <div v-if="me.phone">{{ me.phone }}</div>
                          <div v-if="me.email">{{ me.email }}</div>
                        </td>
                        <td>
                          <div class="client">CLIENT</div>
                          <div v-if="quote.contact.name">{{ quote.contact.name }}</div>
                          <div v-if="quote.contact.nif">{{ quote.contact.nif }}</div>
                          <div v-if="quote.contact.email">{{ quote.contact.email }}</div>
                          <div v-if="quote.contact.address">{{ quote.contact.address }}<br />{{ quote.contact.postcode }} {{ quote.contact.city }}</div>
                          <div v-if="quote.contact.phone">{{ quote.contact.phone }}</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr class="zt-heading">
                  <td :colspan="5">
                    <table>
                      <tr class="t-heading">
                        <td>Concepte</td>
                        <td v-if="showQuantity">Q.</td>
                        <td v-if="showQuantity || showVat">Base</td>
                        <td v-if="showIrpf">IRPF</td>
                        <td v-if="showVat">IVA</td>
                        <td>Total</td>
                      </tr>
                      <tr class="item" v-for="(line, i) in quote.lines" v-bind:key="line.id" :class="{ last: i == line.length}">
                        <td>{{ line.concept }}
                          <div v-if="line.comments" class="comments">
                            <span v-html="line.comments.replace(/(?:\r\n|\r|\n)/g, '<br>')"></span>
                          </div>
                        </td>
                        <td v-if="showQuantity">{{ line.quantity }}</td>
                        <td v-if="showQuantity || showVat">{{ line.base | formatCurrency}}€</td>
                        <td v-if="showIrpf">{{ -1 * line.quantity * line.base * line.irpf / 100 | formatCurrency }} ({{ line.irpf }}%)</td>
                        <td v-if="showVat">{{ line.quantity * line.base * line.vat / 100 | formatCurrency }}  ({{ line.vat }}%)</td>
                        <td>{{ line.quantity * line.base - (line.quantity * line.base * line.irpf / 100) + ( line.quantity * line.base * line.vat / 100) | formatCurrency }}€</td>
                      </tr>
                      <tr class="total">
                        <td :colspan="6">
                          <div>Base imposable: {{ quote.total_base | formatCurrency }}€</div>
                          <div v-if="quote.total_vat">IVA: {{ quote.total_vat | formatCurrency }}€</div>
                          <div v-if="quote.total_irpf">IRPF: {{ -1*quote.total_irpf | formatCurrency }}€</div>
                          <div class="total-val">
                          Total: {{ quote.total | formatCurrency }}€
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr class="zt-heading" v-if="quote.payment_method && quote.payment_method.invoice_text">
                  <td :colspan="5">
                     <table>
                      <tr class="t-heading">
                        <td>Mètode de pagament</td>
                      </tr>
                      <tr>
                        <td>
                        {{ quote.payment_method.invoice_text.replace(/(?:\r\n|\r|\n)/g, '<br>') }}
                        </td>
                      </tr>
                     </table>
                  </td>
                </tr>
              </table>
              <div v-if="quote.comments" class="comments global-comments">
                <div class="more notes">Notes</div>
                <div class="notes-content" v-html="quote.comments.replace(/(?:\r\n|\r|\n)/g, '<br>')"></div>
              </div>
              <div v-if="me.invoice_footer" class="comments global-comments quote-footer">
                <span v-html="me.invoice_footer.replace(/(?:\r\n|\r|\n)/g, '<br>')"></span>
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
      imageUrl: null
    }
  },
  computed: {
    titleStack () {
      return ['Facturació', 'Factures emeses']
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
    showIrpf () {
      return this.quote.lines.find(l => l.irpf > 0) !== undefined
    },
    columnsShown () {
      return this.showQuantity && this.showVat ? 5 : (this.showQuantity ? 3 : 4)
    }
  },
  created () {
    this.getData()
  },
  methods: {
    getData () {
      if (this.$route.params.id) {
        service({ requiresAuth: true })
          .get(`emitted-invoices/${this.$route.params.id}`)
          .then((r) => {
            this.quote = r.data
            console.log('this.invoice', this.quote)
          })
        service({ requiresAuth: true })
          .get('me')
          .then((r) => {
            this.me = r.data
            const img = `${this.baseUrl}${this.me.logo.url}`
            this.toDataUrl(img, (base64) => {
              this.imageUrl = base64
            })
          })
      }
    },
    getPDF () {
      var element = document.getElementById('quote')
      var opt = {
        margin: 1,
        filename: `factura-${this.quote.contact.name}-${this.quote.code}`,
        image: { type: 'jpeg', quality: 1 },
        html2canvas: { dpi: 300, scale: 4, letterRendering: true },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
      }
      html2pdf().set(opt).from(element).save()
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
background: #fff;
}
.invoice-box {
  max-width: 800px;
  margin: 30px;
  padding: 0px;
  font-size: 16px;
  line-height: 24px;
  font-family: 'Helvetica Neue', 'Helvetica', Helvetica, Arial, sans-serif;
  color: #222;
  background: #fff;
}

@media print {
  .invoice-box {
    padding: 0px;
  }
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
.invoice-box table tr td:nth-child(6) {
  text-align: right;
}
.invoice-box table tr td:nth-child(7) {
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
  color:#222;
}
.invoice-box table tr.total td .total-val{
  font-weight: bold;
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
