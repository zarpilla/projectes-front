<template>
  <div class="zcontainer">
    <!--UPLOAD-->
    <form
      enctype="multipart/form-data"
      novalidate
      v-if="isInitial || isSaving || isSuccess"
    >
      <div
        id="dropzone"
        class="dropbox"
        v-cloak
        @drop.prevent="addFile($event)"
        @dragover.prevent
      >
        <input
          type="file"
          :multiple="multiple"
          :name="uploadFieldName"
          :disabled="isSaving"
          @change="filesChange($event, $event.target.name, $event.target.files)"
          :accept="accept"
          class="input-file"
        />
        <p v-if="isInitial || isSuccess" v-html="message">
        </p>
        <p v-if="isSaving">Pujant {{ fileCount }} arxius...</p>
      </div>
    </form>

    <div
      class="notification is-info zis-light"
      v-if="fileCount > 0 && isSaving"
      style="margin-top: 0.5rem"
    >
      <div v-if="fileCount > 0">
        <b class="subtitle">Pujant {{ fileCount }} arxius...</b>
      </div>
      <!-- <div v-if="fileCount > 0">
        <div v-for="(file, i) in fileList" v-bind:key="i">
          {{ file.name }}
        </div>
      </div> -->
    </div>

    <!--SUCCESS-->
    <div v-if="false && isSuccess">
      <h2 class="has-text-primary">
        Pujats {{ uploadedFiles.length }} arxiu(s) correctament.
      </h2>
      <p>
        <a href="javascript:void(0)" @click="reset()">Torna a pujar</a>
      </p>
    </div>
    <!--FAILED-->
    <div v-if="isFailed">
      <h2>Error de pujada.</h2>
      <p>
        <a href="javascript:void(0)" @click="reset()">Torna a provar</a>
      </p>
    </div>
  </div>
</template>

<script>
import { EventBus } from "../service/event-bus.js";
import service from "@/service/index";

const STATUS_INITIAL = 0,
  STATUS_SAVING = 1,
  STATUS_SUCCESS = 2,
  STATUS_FAILED = 3;

export default {
  name: "FileUpload",
  data() {
    return {
      uploadedFiles: [],
      uploadError: null,
      currentStatus: null,
      uploadFieldName: "photos",
      fileCount: 0,
      fileList: [],
      realRefId: null,
    };
  },
  props: {
    entity: String,
    refId: [String,Number],
    field: String,
    multiple: Boolean,
    accept: String,
    preUpload: Function,
    message: {
      type: String,
      default: "Arrossega arxius aquí<br /> o fes clic"
    }
  },
  computed: {
    isInitial() {
      return this.currentStatus === STATUS_INITIAL;
    },
    isSaving() {
      return this.currentStatus === STATUS_SAVING;
    },
    isSuccess() {
      return this.currentStatus === STATUS_SUCCESS;
    },
    isFailed() {
      return this.currentStatus === STATUS_FAILED;
    },
  },
  methods: {
    async addFile(e) {
      let fileList = e.dataTransfer.files;
      if (!fileList) return;

      const formData = new FormData();

      this.realRefId = this.refId

      if (this.preUpload) {
        const resp = await this.preUpload();
        if (resp && resp.data && resp.data.id) {
          this.realRefId = resp.data.id          
        }
      }

      Array.from(Array(fileList.length).keys()).map((x) => {
        formData.append('files', fileList[x], fileList[x].name);
      });
      formData.append('ref', this.entity)
      formData.append('refId', this.realRefId)
      formData.append('field', this.field)

      this.fileCount = fileList.length;

      // save it
      this.save(formData, fileList);
    },
    reset() {
      // reset form to initial state
      this.currentStatus = STATUS_INITIAL;
      this.uploadedFiles = [];
      this.uploadError = null;
    },
    async save(formData, fileList) {
      // upload data to the server
      this.currentStatus = STATUS_SAVING;


      service({ requiresAuth: true, multipart: true }).post("upload", formData)
        .then((res) => {
          console.log("upload", res);
          this.$emit("uploaded", {
            entity: this.entity,
            refId: this.realRefId,
            field: this.field,
            fileList: fileList,
            documents: res.data
          });
          this.currentStatus = STATUS_INITIAL
          this.$buefy.snackbar.open({
            message: 'Pujat correctament',
            queue: false
          })
        })
        .catch(err => {
          console.log(err);
          this.currentStatus = STATUS_INITIAL
          this.$buefy.snackbar.open({
            message: 'Error pujant arxiu',
            queue: false
          })
        });
      
    },
    async filesChange(event, fieldName, fileList) {
      // console.log('(event, fieldName, fileList)', event, fieldName, fileList)
      // handle file changes
      const formData = new FormData();

      if (!fileList.length) return;

      this.realRefId = this.refId

      if (this.preUpload) {
        const resp = await this.preUpload();        
        if (resp && resp.data && resp.data.id) {
          this.realRefId = resp.data.id          
        }
      }

      // append the files to FormData
      Array.from(Array(fileList.length).keys()).map((x) => {
        formData.append('files', fileList[x], fileList[x].name);
      });

      formData.append('ref', this.entity)
      formData.append('refId', this.realRefId)
      formData.append('field', this.field)

      this.fileCount = event.target.files.length;
      //this.fileList = event.target.files
      for (let i in event.target.files) {
        this.fileList.push(event.target.files[i]);
      }
      // save it
      this.save(formData, fileList);
    },
  },
  mounted() {
    this.reset();
  },
};
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
.dropbox {
  outline: 2px dashed #aaa; /* the dash box */
  outline-offset: -10px;
  background: #f9f9f9;
  background: #eeeeee;
  color: dimgray;
  padding: 10px 10px;
  min-height: 80px; /* minimum height */
  position: relative;
  cursor: pointer;
  // font-family: "Varela Round";
  margin-bottom: 2rem;
}

.input-file {
  opacity: 0; /* invisible but it's there! */
  width: 100%;
  height: 100%;
  position: absolute;
  cursor: pointer;
}

.dropbox:hover {
  background: #ddd; /* when mouse over to the drop zone, change color */
}

.dropbox p {
  font-size: 1em;
  text-align: center;
  padding: 30px 0;
}
</style>
