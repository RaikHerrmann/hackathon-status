@description('Static Web App name')
param name string

@description('Location')
param location string

@description('Tags')
param tags object

@secure()
@description('Storage account connection string')
param storageConnectionString string

@description('Application Insights connection string')
param appInsightsConnectionString string

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
    STORAGE_CONNECTION_STRING: storageConnectionString
    APPINSIGHTS_CONNECTION_STRING: appInsightsConnectionString
  }
}

output name string = swa.name
output defaultHostname string = 'https://${swa.properties.defaultHostname}'
