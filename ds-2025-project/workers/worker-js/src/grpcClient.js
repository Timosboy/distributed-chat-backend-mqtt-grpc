import grpc from "@grpc/grpc-js";
import protoLoader from "@grpc/proto-loader";

const pkgDef = protoLoader.loadSync("proto/callback.proto");
const grpcObj = grpc.loadPackageDefinition(pkgDef);
const callbackPackage = grpcObj.callback;

export function sendCallback(endpoint, data) {
  return new Promise((resolve, reject) => {
    const client = new callbackPackage.CallbackService(
      endpoint,
      grpc.credentials.createInsecure()
    );

    client.SendResult(data, (err, res) => {
      if (err) reject(err);
      else resolve(res);
    });
  });
}

