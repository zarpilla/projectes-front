import service from "@/service/index";
import moment from "moment";
import sortBy from "lodash/sortBy";


const zeroPad = (num, places) => {
  return String(num).padStart(places, "0");
}

const getTreasuryData = async (
  project_states,
  year,
  bank_account_id,
  periodification = null,
  project_types = null,
  project_likelihoods = null
) => {

  project_states = project_states.join(',')

  let url = `treasuries/forecast?_limit=-1&project_states=${project_states}&year=${year}&periodification=${periodification}`
  if (bank_account_id) {
    url += `&bank_account_id=${encodeURIComponent(bank_account_id)}`
  }
  // Filter by project type / likelihood. "null" is a valid token that
  // represents the "Sense" bucket (projects with no value set).
  //   - array not provided (null) => omit the param => backend applies no filter
  //   - array empty ([])          => send param empty => backend matches nothing
  //   - array with ids            => send comma-joined ids (+ "null" token)
  if (project_types !== null) {
    const ids = project_types.map(t => (t === null ? 'null' : t)).join(',')
    url += `&project_types=${encodeURIComponent(ids)}`
  }
  if (project_likelihoods !== null) {
    const ids = project_likelihoods.map(l => (l === null ? 'null' : l)).join(',')
    url += `&project_likelihoods=${encodeURIComponent(ids)}`
  }

  const { data } = (
    await service({ requiresAuth: true }).get(url)
  );

  return data

};

export default getTreasuryData;
