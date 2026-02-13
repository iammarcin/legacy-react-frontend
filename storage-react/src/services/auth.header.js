import {
  getAuthTokenForBackend,
} from '../utils/configuration';

export default function authHeader() {
  const user = 1; // JSON.parse(localStorage.getItem('user'));
  if (user) { // && user.value.accessToken) {
    // for Node.js Express back-end
    //return { 'x-access-token': user.value.accessToken };
    // for fastapi
    // get token
    //const authToken2 = JSON.parse(localStorage.getItem('authToken'));
    //return { Authorization: authToken && authToken.token ? 'Bearer ' + authToken.token : '' };
    const authToken = getAuthTokenForBackend();

    if (authToken) {
      return { Authorization: 'Bearer ' + authToken };
    }
    return {};
  } else {
    return {};
  }
}
