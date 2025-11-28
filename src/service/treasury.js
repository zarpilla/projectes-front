import service from "@/service/index";
import moment from "moment";
import sortBy from "lodash/sortBy";


const zeroPad = (num, places) => {
  return String(num).padStart(places, "0");
}

const getTreasuryData = async (project_states, year, bank_account_id) => {

  project_states = project_states.join(',')

  let url = `treasuries/forecast?_limit=-1&project_states=${project_states}&year=${year}`
  if (bank_account_id) {
    url += `&bank_account_id=${encodeURIComponent(bank_account_id)}`
  }

  const { data } = (
    await service({ requiresAuth: true }).get(url)
  );

  return data

};

export default getTreasuryData;
