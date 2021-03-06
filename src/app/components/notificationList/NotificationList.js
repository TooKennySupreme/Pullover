import React from 'react'
import Promise from 'promise'
import {InfiniteLoader, VirtualScroll, CellMeasurer, CellSizeCache} from 'react-virtualized'
import {Alert} from 'react-bootstrap'
import Window from '../../nw/Window'
import Settings from '../../services/Settings'
import NotificationDB from '../../services/NotificationDB'
import Debug from '../../lib/debug'
var debug = Debug('NotificationList')

import Notification from './Notification'
import Spinner from '../Spinner'

import './NotificationList.scss'

const NotificationList = React.createClass({
  displayName: 'NotificationList',
  windowHeight: 600,
  windowWidth: 450,
  _isMounted: false,

  getInitialState() {
    return {
      list: [],
      loading: true,
      rowCount: -1
    }
  },

  isRowLoaded({index}) {
    const list = this.state.list
    return !!list[index]
  },

  loadMoreRows({startIndex, stopIndex}) {
    return new Promise((resolve, reject) => {
      // Call to DB
      const notificationDB = NotificationDB.getDBInstance()
      notificationDB.find({}).sort({umid: -1}).skip(startIndex).limit(stopIndex - startIndex + 1).exec(function (err, docs) {
        if (err)
          reject(err)
        var newList = this.state.list
        var index = startIndex
        docs.forEach((notification) => {
          newList[index] = notification
          index++
        })
        if (this._isMounted)
          this.setState({list: newList})
        resolve()
      }.bind(this))
    })
  },

  totalRowCount() {
    // Return preliminary and trigger update of rowCount
    if (this.state.rowCount === -1) {
      NotificationDB
        .count()
        .then((rowCount) => {
          this.setState({rowCount})
        })
      return 1000
    }
    return this.state.rowCount
  },

  // Resize window
  componentWillMount() {
    this._isMounted = true
    Window.resizeTo(Settings.get('windowWidth'), this.windowHeight)
    // Load first rows before rendering List
    this.refresh();
  },

  // Revert to old size
  componentWillUnmount() {
    this._isMounted = false
    Window.resizeTo(Settings.get('windowWidth'), Settings.get('windowHeight'))
  },

  render() {
    const list = this.state.list
    // Loading?
    if (this.state.loading)
      return ( <Spinner active={true}/> )
    // No notifications?
    if (list.length === 0)
      return ( <Alert bsStyle="info">No notifications received</Alert>)
    // Show the list of notifications
    return (
      <div>
        <div className="refreshNotificationList"><a onClick={this.refresh}>Refresh</a></div>
        <InfiniteLoader
          isRowLoaded={this.isRowLoaded}
          loadMoreRows={this.loadMoreRows}
          rowCount={this.totalRowCount()}
        >
          {({onRowsRendered, registerChild}) => (
            <CellMeasurer
              cellRenderer={this.cellRenderer}
              columnCount={1}
              rowCount={list.length}
              >
              {(cellMeasurer) => {
                return (
                  <VirtualScroll
                    ref={registerChild}
                    width={this.windowWidth}
                    height={this.windowHeight - 69}
                    onRowsRendered={onRowsRendered}
                    overscanRowCount={20}
                    rowCount={list.length}
                    rowHeight={cellMeasurer.getRowHeight}
                    rowRenderer={this.rowRenderer}
                  />
                )
              }}
            </CellMeasurer>
          )}
        </InfiniteLoader>
      </div>
    )
  },

  rowRenderer({index}) {
    return (<Notification notification={this.state.list[index]}/>)
  },
  // Parameter transformation of rowRenderer for CellMeasurer
  cellRenderer(params) {
    return this.rowRenderer({index: params.rowIndex})
  },
  // Reset the list and load it from scratch
  refresh() {
    this.setState({list: [], loading: true})
    this.loadMoreRows({startIndex: 0, stopIndex: 20})
      .then(() => {
        if (this._isMounted)
          this.setState({loading: false});
      })
  }
})

export default NotificationList
