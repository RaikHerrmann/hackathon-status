@description('Static Web App name')
param name string

@description('Location')
param location string

@description('Tags')
param tags object

@secure()
@description('Storage account name')
param storageAccountName string

@description('Storage account resource ID')
param storageAccountId string

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
  identity: {
    type: 'SystemAssigned'
  }
  properties: {}
}

// Storage Table Data Contributor role
var storageTableDataContributor = '0a9a7e1f-b9d0-4cc4-a60d-0319b160aaa3'

resource roleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(swa.id, storageTableDataContributor, storageAccountId)
  scope: storageAccount
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', storageTableDataContributor)
    principalId: swa.identity.principalId
    principalType: 'ServicePrincipal'
  }
}

resource storageAccount 'Microsoft.Storage/storageAccounts@2023-05-01' existing = {
  name: storageAccountName
}

resource swaAppSettings 'Microsoft.Web/staticSites/config@2023-12-01' = {
  parent: swa
  name: 'appsettings'
  properties: {
    STORAGE_ACCOUNT_NAME: storageAccountName
    APPINSIGHTS_CONNECTION_STRING: appInsightsConnectionString
  }
}

output name string = swa.name
output defaultHostname string = 'https://${swa.properties.defaultHostname}'
