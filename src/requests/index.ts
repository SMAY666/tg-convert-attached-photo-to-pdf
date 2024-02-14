import axios from 'axios';

export async function sendRequest(method: 'GET' | 'POST', url: string, data?: object) {
    return axios({
        method,
        url,
        data,
    });
}
