// IVA › Models 303 i 390: the AEAT's PDF of a filed return (the receipt with
// its CSV). Uploaded like any file, then linked to the return by the backend
// (PUT treasuries/vat-models/returns/:id/receipt), which deletes the one it
// replaces.
import service from "@/service/index";
import getConfig from "@/config";

export const isPdf = file => !!file && (file.type === "application/pdf" || /\.pdf$/i.test(file.name || ""));

export async function attachVatReceipt(returnId, file) {
  if (!isPdf(file)) throw new Error("El justificant ha de ser un PDF.");
  const formData = new FormData();
  formData.append("files", file, file.name);
  const uploaded = (await service({ requiresAuth: true, multipart: true }).post("upload", formData)).data;
  const fileId = Array.isArray(uploaded) ? uploaded[0] && uploaded[0].id : uploaded && uploaded.id;
  if (!fileId) throw new Error("No s'ha pogut pujar el fitxer.");
  return (await service({ requiresAuth: true }).put(`treasuries/vat-models/returns/${returnId}/receipt`, { file: fileId })).data;
}

export async function removeVatReceipt(returnId) {
  return (await service({ requiresAuth: true }).put(`treasuries/vat-models/returns/${returnId}/receipt`, { file: null })).data;
}

export const receiptUrl = file => {
  if (!file || !file.url) return null;
  return /^https?:/.test(file.url) ? file.url : getConfig().VUE_APP_API_URL + file.url;
};
