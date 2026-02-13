import authHeader from './auth.header';
import config from '../config';

export default async function makeApiCall({
  endpoint = "",
  method = "GET",
  headers = { "Content-Type": "application/json" },
  body = {},
  //timeout = 90000,
  binaryResponse = false,
  streamResponse = false,
  onChunkReceived = () => { },
  onStreamEnd = () => { },
} = {}) {
  if (endpoint === "") {
    throw new Error("Endpoint is required");
  }
  if (method.toUpperCase() === "GET") {
    // For GET requests, we don't need to send any data in the request body
    body = undefined;
  } else if (body instanceof FormData) {
    // For FormData, do not set Content-Type header
    delete headers["Content-Type"];
  } else {
    body = JSON.stringify(body);
  }

  let response;

  try {
    const controller = new AbortController();
    /*const callTimeout = setTimeout(() => {
      controller.abort();
    }, timeout);*/

    //headers = {"Content-Type": "application/json"}
    if (!endpoint.includes("registerUser")) {
      headers = {
        ...headers,
        ...authHeader()
      }
    }

    response = await fetch(endpoint, {
      method,
      headers,
      body: body,
      signal: controller.signal
    });

    if (streamResponse) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let result;
      var fullResponse = '';
      while (!(result = await reader.read()).done) {
        const chunk = decoder.decode(result.value, { stream: true });
        fullResponse += chunk;
        onChunkReceived(chunk);
      }
      // full response received
      onStreamEnd(fullResponse);
      return;
    }

    const data = await response.json();
    if (config.DEBUG === 1) {
      console.log("response: ", data)
    }

    if (response.ok && data.success) {
      return {
        code: data.code ?? response.status,
        success: true,
        message: data.message,
        data: data.data ?? null,
        meta: data.meta ?? {},
      };
    }

    if (response.status === 401) {
      return { code: 401, success: false, message: "Unauthorized", data: null, meta: {} };
    }

    return {
      code: data.code || response.status,
      success: false,
      message: data.message || 'Unknown error',
      data: data.data ?? null,
      meta: data.meta ?? {},
    };

  } catch (error) {
    if (error.name === "AbortError") {
      return { code: 408, success: false, message: "Problem reaching auth server. Please contact us!", data: null, meta: {} };
    }

    console.log("error: ", error)

    const isParseError = error instanceof SyntaxError;
    const statusCode = response?.status ?? 500;

    return {
      code: statusCode,
      success: false,
      message: isParseError
        ? `Failed to parse response: ${error.message}`
        : (error.message || "Something went wrong"),
      data: null,
      meta: {},
    };
  }
}
