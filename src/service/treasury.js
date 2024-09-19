import service from "@/service/index";
import moment from "moment";
import sortBy from "lodash/sortBy";


const zeroPad = (num, places) => {
  return String(num).padStart(places, "0");
}

const getTreasuryData = async (project_states) => {

  project_states = project_states.join(',')

  const { data } = (
    await service({ requiresAuth: true }).get(`treasuries/forecast?_limit=-1&project_states=${project_states}`)
  );

  return data

};

export default getTreasuryData;
