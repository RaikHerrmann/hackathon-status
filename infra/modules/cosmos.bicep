@description('Cosmos DB account name')
param name string

@description('Location for the Cosmos DB account')
param location string

@description('Tags for the resource')
param tags object

@description('Name of the database')
param databaseName string

resource cosmosAccount 'Microsoft.DocumentDB/databaseAccounts@2024-02-15-preview' = {
  name: name
  location: location
  tags: tags
  kind: 'GlobalDocumentDB'
  properties: {
    databaseAccountOfferType: 'Standard'
    locations: [
      {
        locationName: location
        failoverPriority: 0
        isZoneRedundant: false
      }
    ]
    capabilities: [
      { name: 'EnableServerless' }
    ]
    consistencyPolicy: {
      defaultConsistencyLevel: 'Session'
    }
  }
}

resource database 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases@2024-02-15-preview' = {
  parent: cosmosAccount
  name: databaseName
  properties: {
    resource: {
      id: databaseName
    }
  }
}

resource roundsContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2024-02-15-preview' = {
  parent: database
  name: 'rounds'
  properties: {
    resource: {
      id: 'rounds'
      partitionKey: {
        paths: ['/id']
        kind: 'Hash'
      }
    }
  }
}

resource participantsContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2024-02-15-preview' = {
  parent: database
  name: 'participants'
  properties: {
    resource: {
      id: 'participants'
      partitionKey: {
        paths: ['/roundId']
        kind: 'Hash'
      }
    }
  }
}

output accountName string = cosmosAccount.name
output endpoint string = cosmosAccount.properties.documentEndpoint
