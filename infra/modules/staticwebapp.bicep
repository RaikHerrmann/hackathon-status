@description('Static Web App name')
param name string

@description('Location')
param location string

@description('Tags')
param tags object

@description('Cosmos DB account name')
param cosmosAccountName string

@description('Cosmos DB endpoint')
param cosmosEndpoint string

@description('Application Insights connection string')
param appInsightsConnectionString string

resource cosmosAccount 'Microsoft.DocumentDB/databaseAccounts@2024-02-15-preview' existing = {
  name: cosmosAccountName
}

resource swa 'Microsoft.Web/staticSites@2023-12-01' = {
  name: name
  location: location
  tags: union(tags, { 'azd-service-name': 'web' })
  sku: {
    name: 'Free'
    tier: 'Free'
  }
  properties: {}
}

resource swaAppSettings 'Microsoft.Web/staticSites/config@2023-12-01' = {
  parent: swa
  name: 'appsettings'
  properties: {
    COSMOS_ENDPOINT: cosmosEndpoint
    COSMOS_KEY: cosmosAccount.listKeys().primaryMasterKey
    COSMOS_DATABASE: 'hackathon'
    APPINSIGHTS_CONNECTION_STRING: appInsightsConnectionString
  }
}

output name string = swa.name
output defaultHostname string = 'https://${swa.properties.defaultHostname}'
