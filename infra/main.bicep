targetScope = 'subscription'

@minLength(1)
@maxLength(64)
@description('Name of the environment (e.g., dev, prod)')
param environmentName string

@minLength(1)
@description('Primary location for all resources')
param location string

var abbrs = loadJsonContent('./abbreviations.json')
var resourceToken = toLower(uniqueString(subscription().id, environmentName, location))
var tags = { 'azd-env-name': environmentName }

resource rg 'Microsoft.Resources/resourceGroups@2022-09-01' = {
  name: '${abbrs.resourcesResourceGroups}${environmentName}'
  location: location
  tags: tags
}

module storage './modules/storage.bicep' = {
  name: 'storage'
  scope: rg
  params: {
    name: '${abbrs.storageAccounts}${resourceToken}'
    location: location
    tags: tags
  }
}

module monitoring './modules/monitoring.bicep' = {
  name: 'monitoring'
  scope: rg
  params: {
    logAnalyticsName: '${abbrs.operationalInsightsWorkspaces}${resourceToken}'
    appInsightsName: '${abbrs.insightsComponents}${resourceToken}'
    location: location
    tags: tags
  }
}

module swa './modules/staticwebapp.bicep' = {
  name: 'swa'
  scope: rg
  params: {
    name: '${abbrs.webStaticSites}${resourceToken}'
    location: 'eastus2'
    tags: tags
    storageAccountName: storage.outputs.accountName
    storageAccountId: storage.outputs.accountId
    appInsightsConnectionString: monitoring.outputs.appInsightsConnectionString
  }
}

output AZURE_RESOURCE_GROUP string = rg.name
output AZURE_SWA_NAME string = swa.outputs.name
output AZURE_SWA_URL string = swa.outputs.defaultHostname
