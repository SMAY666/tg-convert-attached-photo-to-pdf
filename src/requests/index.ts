import axios, {ResponseType} from 'axios';

export async function sendRequest(method: 'GET' | 'POST', url: string, params?: object, data?: object, responseType?: ResponseType) {
    return axios({
        method,
        url,
        params,
        data,
        responseType,
    });
}
