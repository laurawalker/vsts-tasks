import msRestAzure = require("./azure-arm-common");
import azureServiceClient = require("./AzureServiceClient");
import tl = require('vsts-task-lib/task');

export class AzureKeyVaultSecret {
    name: string;
    enabled: boolean;
    expires: Date;
    contentType: string;
}

export class KeyVaultClient extends azureServiceClient.ServiceClient {
    private keyVaultName;
    private keyVaultUrl;

    constructor(credentials: msRestAzure.ApplicationTokenCredentials, 
        subscriptionId: string,
        keyVaultName: string,
        keyVaultUrl: string) {

        super(credentials, subscriptionId);

        this.keyVaultName = keyVaultName;
        this.keyVaultUrl = keyVaultUrl;
        this.apiVersion = '2016-10-01';
    }

    public getSecrets(nextLink: string, callback: azureServiceClient.ApiCallback) {
        if (!callback) {
            throw new Error(tl.loc("CallbackCannotBeNull"));
        }

        // Create HTTP transport objects
        var url = nextLink;
        if (!url)
        {
            url = this.getRequestUri(
                this.keyVaultUrl,
                '/secrets',
                {},
                ['maxresults=25']);
        }

        var httpRequest = new azureServiceClient.WebRequest();
        httpRequest.method = 'GET';
        httpRequest.headers = {};
        httpRequest.uri = url;

        console.log(tl.loc("DownloadingSecretsUsing", url));
        
        this.beginRequest(httpRequest).then(async (response: azureServiceClient.WebResponse) => {
            var result = [];
            if (response.statusCode == 200) {
                if (response.body.value) {
                    result = result.concat(response.body.value);
                }
                var listOfSecrets = this.convertToAzureKeyVaults(result);

                if (response.body.nextLink) {
                    this.getSecrets(response.body.nextLink, (error, listOfSecretsFromNextLink, request, response) => {
                        if (error) {
                            callback(error);
                        }

                        if (!!listOfSecretsFromNextLink)
                        {
                            tl.debug("listOfSecretsFromNextLink: " + listOfSecretsFromNextLink.length);
                            listOfSecretsFromNextLink.forEach(element => {
                                listOfSecrets.push(element);
                            });
                        }
                        callback(null, listOfSecrets);
                    });
                }
                else {
                    return new azureServiceClient.ApiResult(null, listOfSecrets);
                }
            }
            else {
                return new azureServiceClient.ApiResult(azureServiceClient.ToError(response));
            }
        }).then((apiResult: azureServiceClient.ApiResult) => callback(apiResult.error, apiResult.result),
            (error) => callback(error));
    }

    public getSecretValue(secretName: string, callback: azureServiceClient.ApiCallback) {
        if (!callback) {
            throw new Error(tl.loc("CallbackCannotBeNull"));
        }

        // Create HTTP transport objects
        var httpRequest = new azureServiceClient.WebRequest();
        httpRequest.method = 'GET';
        httpRequest.headers = {};
        httpRequest.uri = this.getRequestUri(
            this.keyVaultUrl,
            '/secrets/{secretName}',
            {
                '{secretName}': secretName
            }
        );

        console.log(tl.loc("DownloadingSecretValue", secretName));
        this.beginRequest(httpRequest).then(async (response: azureServiceClient.WebResponse) => {
            if (response.statusCode == 200) {
                var result = response.body.value;
                return new azureServiceClient.ApiResult(null, result);
            }
            else {
                return new azureServiceClient.ApiResult(azureServiceClient.ToError(response));
            }
        }).then((apiResult: azureServiceClient.ApiResult) => callback(apiResult.error, apiResult.result),
            (error) => callback(error));
    }

    private convertToAzureKeyVaults(result: any[]): AzureKeyVaultSecret[] {
        var listOfSecrets: AzureKeyVaultSecret[] = [];
        result.forEach((value: any, index: number) => {
            var expires;
            if (value.attributes.exp)
            {
                expires = new Date(0);
                expires.setSeconds(parseInt(value.attributes.exp));
            }

            var secretIdentifier: string = value.id;
            var lastIndex = secretIdentifier.lastIndexOf("/");
            var name: string = secretIdentifier.substr(lastIndex + 1, secretIdentifier.length);

            var azkvSecret: AzureKeyVaultSecret = {
                name: name,
                contentType: value.contentType,
                enabled: value.attributes.enabled,
                expires: expires
            };

            listOfSecrets.push(azkvSecret);
        });

        return listOfSecrets;
    }
}