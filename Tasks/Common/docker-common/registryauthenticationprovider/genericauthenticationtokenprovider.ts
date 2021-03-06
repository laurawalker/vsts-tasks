"use strict";

import RegistryAuthenticationToken from "./registryauthenticationtoken"
import AuthenticationTokenProvider from "./authenticationtokenprovider"
import * as tl from "vsts-task-lib/task";

export default class GenericAuthenticationTokenProvider extends AuthenticationTokenProvider{

    private registryAuth: { [key: string]: string };
    
    constructor(endpointName?: string) {
        super();
        
        if(endpointName) {
            this.registryAuth = tl.getEndpointAuthorization(endpointName, true).parameters;
        }
    }
    
    public getAuthenticationToken(): RegistryAuthenticationToken {
        
        if(this.registryAuth) {    
            return new RegistryAuthenticationToken(this.registryAuth["username"], this.registryAuth["password"], this.registryAuth["registry"], this.registryAuth["email"], "generic/vsts");
        }
        
        return null;
    }
}