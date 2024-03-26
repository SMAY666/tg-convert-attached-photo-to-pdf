import axios from 'axios';

export async function sendRequest(method: 'GET' | 'POST', url: string, params?: object, data?: object) {
    return axios({
        method,
        url,
        params,
        data,
    });
}
