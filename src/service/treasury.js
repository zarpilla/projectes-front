import service from "@/service/index";
import moment from "moment";
import sortBy from "lodash/sortBy";


const zeroPad = (num, places) => {
  return String(num).padStart(places, "0");
}

const getTreasuryData = async (filter, year) => {


  const { data } = (
    await service({ requiresAuth: true }).get(`treasuries/forecast?_limit=-1&filter=${filter}`)
  );

  return data

};

export default getTreasuryData;
